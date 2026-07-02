## Summary

Closes #[issue number]

Briefly describe what this PR does in 2-3 sentences.

## This repo is for the React Native mobile app only

This app targets learners only.
Sponsor, vendor, and mentor features belong
in StepFi-Web, not here.

Before submitting, confirm your changes belong here:

- [ ] My changes are React Native components
      or Expo code
- [ ] I have NOT added web-only APIs
      (window, document, localStorage)
- [ ] I have NOT hardcoded hex color values
      (use constants/colors.ts only)
- [ ] All icons are from lucide-react-native only
- [ ] No API calls made directly in screen files
      (use services/ layer only)
- [ ] Every screen has loading, error,
      and empty states

## Type of change

- [ ] Bug fix
- [ ] New screen
- [ ] New component
- [ ] Service or store change
- [ ] Navigation change
- [ ] Performance or offline improvement

## Testing

- [ ] npx expo export --platform web passes
- [ ] No TypeScript errors
- [ ] Tested on Android emulator or physical device
- [ ] No hardcoded hex colors
- [ ] No console errors

## Context files reviewed

- [ ] context/architecture-context.md
- [ ] context/code-standards.md

## Mandatory before requesting review

This must exit 0:
npx expo export --platform web

If it fails, fix it before opening this PR.
PRs with failing CI will be closed without review.
