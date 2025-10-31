# Skill Developer

**Meta-Skill** - Create and update skills for Waterfall

## Purpose

This skill helps you create new skills and update existing ones as the Waterfall project evolves.

## Skill Structure

### Main SKILL.md (<500 lines)

```markdown
# Skill Name

**Domain/Navigation Skill** - Brief description

## Overview
What this skill covers, when to use it

## Key Concepts
Main patterns and principles

## Common Patterns
Code examples

## Resource Files
Links to detailed resources

## Best Practices
Always/Never lists
```

### Resource Files (Detailed Content)

- Place in `resources/` subdirectory
- One topic per file
- Include complete code examples
- Link from main SKILL.md

## Creating a New Skill

1. **Create directory structure:**
```bash
mkdir -p .claude/skills/my-skill/resources
```

2. **Create SKILL.md** (keep under 500 lines)

3. **Create resource files** for detailed content

4. **Update skill-rules.json:**
```json
{
  "my-skill": {
    "type": "domain",
    "enforcement": "suggest",
    "priority": "high",
    "promptTriggers": {
      "keywords": ["relevant", "keywords"],
      "intentPatterns": ["(create|add).*?feature"]
    },
    "fileTriggers": {
      "pathPatterns": ["app/**/*.tsx"],
      "contentPatterns": ["pattern.*in.*code"]
    }
  }
}
```

## Updating Existing Skills

1. Read current skill file
2. Identify what needs updating
3. If >500 lines, move content to resource file
4. Update resource file instead of main skill
5. Test by invoking the skill

## Best Practices

- Keep main skill file navigable (<500 lines)
- Use progressive disclosure (main → resources)
- Include code examples
- Link to official docs when helpful
- Update skill-rules.json for auto-activation
