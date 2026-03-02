## trouble in insert-question.ts

each single question (interactive confirmation)

`npx tsx .agent/skills/generate-quiz/scripts/insert-question.ts --level <N> --rollup prompt --title "Level Title" --question "question text"  --options '["Zero-shot","Chain of Thought","Few-shot","Role-play"]'  --correct 1  --explanation "CoT prompting elicits step-by-step reasoning."`

### help

```
npx tsx .agent/skills/generate-quiz/scripts/insert-question.ts \
  --rollup prompt \
  --level 2 \
  --title "Zero-shot vs Few-shot" \
  --question "Which technique asks an LLM to reason step by step?" \
  --options '["Zero-shot","Chain of Thought","Few-shot","Role-play"]' \
  --correct 1 \
  --explanation "CoT prompting elicits step-by-step reasoning."
```

Optional flags:

```
--xp <N>            Override auto-computed xp_reward
--upsert            Update on (rollup, level_number, question_number) conflict
--dry-run           Validate and print without writing
--yes               Skip interactive confirmation
```