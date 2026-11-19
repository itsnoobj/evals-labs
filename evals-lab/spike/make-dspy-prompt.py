"""Capture the REAL prompts DSPy builds for the credit-card agent, without calling any model.

DSPy sends its messages to a DummyLM that only replays the minimum scripted answers needed to keep the
program running. Only the messages DSPy sends are kept. Card data comes from tools-export.json
(written by export-tools.mjs from cases.js), never copied by hand.

Run: node evals-lab/spike/export-tools.mjs && /tmp/dspy-venv/bin/python evals-lab/spike/make-dspy-prompt.py
"""
import json
import math
import platform
from pathlib import Path

import dspy
from dspy.teleprompt import LabeledFewShot
from dspy.utils import DummyLM

HERE = Path(__file__).parent
DATA = json.loads((HERE / "tools-export.json").read_text())
OUT = HERE.parent / "dspy-prompt.json"

INSTRUCTION = (
    "Pick the best credit card for the purchase. Use the tools. "
    "Only use numbers that come from tool results."
)
SIGNATURE = "question -> card: str, reward_inr: float, reply: str"


def classify_merchant(merchant: str) -> str:
    """Look up the spending category of a merchant name, e.g. "Amazon" -> "amazon".

    Returns one of the known category names, or a string starting with "error:" if the merchant is unknown.
    """
    category = DATA["merchants"].get(merchant.strip().lower())
    return category if category else f"error: unknown merchant: {merchant}"


def rank_cards(amount: float, category: str) -> list:
    """Rank all credit cards for a purchase, best first.

    Args:
        amount: purchase amount in rupees, greater than 0.
        category: a category returned by classify_merchant.

    Returns a list of {"card": card id, "rate_pct": reward rate in percent, "reward_inr": rupees earned},
    best reward first, ties broken by card id. Returns an error string for a bad amount or category.
    """
    if not isinstance(amount, (int, float)) or amount <= 0:
        return f"error: invalid amount: {amount}"
    if category not in DATA["categories"]:
        return f"error: unknown category: {category}"
    ranked = [
        {
            "card": card_id,
            "rate_pct": card["rates"][category],
            # same rounding as cases.js: Math.round(amount * rate) / 100
            "reward_inr": math.floor(amount * card["rates"][category] + 0.5) / 100,
        }
        for card_id, card in DATA["cards"].items()
    ]
    ranked.sort(key=lambda r: (-r["reward_inr"], r["card"]))
    return ranked


def reply_sentence(case) -> str:
    """Demo reply written from the case's expected values only."""
    card = DATA["cards"][case["expected"]["card"]]["name"]
    return f"Use {card} for {case['merchant']} to earn ₹{case['expected']['reward_inr']} on ₹{case['amount']}."


def make_signature():
    return dspy.Signature(SIGNATURE, INSTRUCTION)


def to_messages(history_entry):
    return [{"role": m["role"], "content": m["content"]} for m in history_entry["messages"]]


def tool_call(name, args):
    return dspy.ToolCalls.from_dict_list([{"name": name, "args": args}])


def scripted_react_answers(case):
    """Minimum LM replies to walk ReAct through the case's expected trajectory, then submit.

    DSPy 3.5 ReAct has no separate extract step: the last turn calls the built-in `submit` tool.
    """
    (classify, rank) = case["expectedTrajectory"]
    exp = case["expected"]
    return [
        {"next_thought": "Find the category.", "tool_calls": tool_call(classify["tool"], classify["args"])},
        {"next_thought": "Rank the cards.", "tool_calls": tool_call(rank["tool"], rank["args"])},
        {"next_thought": "Submit.", "tool_calls": tool_call(
            "submit", {"card": exp["card"], "reward_inr": exp["reward_inr"], "reply": reply_sentence(case)})},
    ]


def capture_zero_shot(case):
    lm = DummyLM(scripted_react_answers(case))
    dspy.configure(lm=lm)
    agent = dspy.ReAct(make_signature(), tools=[classify_merchant, rank_cards], max_iters=4)
    result = agent(question=case["query"])
    assert len(lm.history) == 3, f"expected 3 ReAct turns (2 tools + submit), got {len(lm.history)}"
    return {
        "first": to_messages(lm.history[0]),
        "second": to_messages(lm.history[1]),
        "final": to_messages(lm.history[-1]),
        "tools": agent.tools,
        "result": result,
    }


def capture_few_shot(case, demo_cases):
    trainset = [
        dspy.Example(
            question=c["query"], card=c["expected"]["card"],
            reward_inr=c["expected"]["reward_inr"], reply=reply_sentence(c),
        ).with_inputs("question")
        for c in demo_cases
    ]
    # Try the real thing first: LabeledFewShot on ReAct. It attaches demos to ReAct's inner predictors.
    lm = DummyLM(scripted_react_answers(case))
    dspy.configure(lm=lm)
    react = dspy.ReAct(make_signature(), tools=[classify_merchant, rank_cards], max_iters=4)
    tuned = LabeledFewShot(k=3).compile(react, trainset=trainset)
    tuned(question=case["query"])
    react_first = to_messages(lm.history[0])
    # Demos reached the prompt only if a demo question appears in a message other than the final user turn.
    react_demo_in_prompt = any(
        c["query"] in m["content"] for c in demo_cases for m in react_first[1:-1]
    )

    # Predict variant: demos match the signature exactly, so the demo block is clean.
    lm2 = DummyLM([{"card": case["expected"]["card"], "reward_inr": case["expected"]["reward_inr"], "reply": reply_sentence(case)}])
    dspy.configure(lm=lm2)
    predict = LabeledFewShot(k=3).compile(dspy.Predict(make_signature()), trainset=trainset)
    predict(question=case["query"])
    return {
        "react_first": react_first,
        "react_demo_in_prompt": react_demo_in_prompt,
        "predict_first": to_messages(lm2.history[0]),
    }


def main():
    cases = DATA["cases"]
    case, demo_cases = cases[0], cases[1:4]  # CASES[0] is the target; three OTHER cases are the demos

    zero = capture_zero_shot(case)
    few = capture_few_shot(case, demo_cases)

    # Use the ReAct+demos capture only if the demos reached the prompt as complete card/reward/reply examples.
    use_react_demos = few["react_demo_in_prompt"]
    few_messages = few["react_first"] if use_react_demos else few["predict_first"]
    few_label = (
        "Few-shot: dspy.ReAct + LabeledFewShot(k=3), first turn"
        if use_react_demos
        else "Few-shot: dspy.Predict + LabeledFewShot(k=3) (ReAct dropped the demos, see note)"
    )
    print("react_demo_in_prompt:", few["react_demo_in_prompt"])

    note = (
        "This is DSPy's real prompt format, generated with a recording fake model (dspy.utils.DummyLM); "
        "no optimizer was run against our 1.5B model. Our live agent does not use this prompt "
        "(it uses the shorter prompt in agent-step.js) unless a later change measures it. "
        f"Target question is {case['id']}; few-shot demos come from {', '.join(c['id'] for c in demo_cases)} "
        "with reply sentences written from their expected values. "
        "DSPy %s ReAct has no separate extract step: it calls a built-in submit tool, so the zero-shot variant also carries secondTurnMessages (after one tool result) and finalTurnMessages (the submit turn). " % dspy.__version__
        + (
            "Few-shot variant is dspy.ReAct with LabeledFewShot."
            if use_react_demos
            else ("Few-shot variant is dspy.Predict with LabeledFewShot over the same signature. LabeledFewShot on dspy.ReAct ran, but its prompt came out identical to zero-shot: "
                "the demos (question, card, reward_inr, reply) do not match ReAct's inner signature (next_thought, tool_calls), so DSPy dropped them. "
                "The Predict variant has no tools, so its instruction sentence mentions tools that it cannot call.")
        )
    )
    out = {
        "dspyVersion": dspy.__version__,
        "pythonVersion": platform.python_version(),
        "generatedBy": "evals-lab/spike/make-dspy-prompt.py",
        "signature": f"{SIGNATURE}  # instructions: {INSTRUCTION}",
        "tools": [{"name": t.name, "doc": t.desc} for t in zero["tools"].values()]
        if isinstance(zero["tools"], dict)
        else [{"name": t.name, "doc": t.desc} for t in zero["tools"]],
        "variants": [
            {
                "id": "zero-shot-react",
                "label": "Zero-shot: dspy.ReAct, first turn",
                "messages": zero["first"],
                "secondTurnMessages": zero["second"],
                "finalTurnMessages": zero["final"],
            },
            {"id": "few-shot", "label": few_label, "messages": few_messages},
        ],
        "note": note,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n")
    for v in out["variants"]:
        print(v["id"], sum(len(m["content"]) for m in v["messages"]), "chars")
    print("second-turn", sum(len(m["content"]) for m in zero["second"]), "chars")
    print("final-turn", sum(len(m["content"]) for m in zero["final"]), "chars")
    print("wrote", OUT)


if __name__ == "__main__":
    main()
