---
name: ui-optimization
description: Optimizes the canvas UI design for improved responsiveness, aesthetic appeal, and accessibility. Ensures existing features and functionality remain unchanged.
context: fork
---

# UI Optimization for Canvas Design

## Overview

This skill defines **design-focused guidance and hard constraints** for improving the visual quality of an existing **React-based canvas application**.

The purpose of this skill is to elevate the UI through better typography, color usage, motion, and visual depth, following modern frontend design principles, **without altering or risking any existing functionality**.

This skill must be applied strictly at the **presentation layer** (CSS, styling systems, theming, and visual composition).

> **Explicit Prohibition:**  
> Any change that affects application logic, existing features, state management, rendering behavior, or user interactions is strictly forbidden.

---

## Goal

- Improve the aesthetic quality and perceived polish of the canvas UI.
- Enhance readability, hierarchy, and visual clarity.
- Introduce tasteful motion and depth to improve user experience.
- Maintain responsiveness and accessibility standards.
- **Guarantee that all existing functionality, behavior, and performance remain unchanged.**

---

## Core Design Principles

### Typography
- Avoid default or overused fonts (e.g., system UI fonts, Inter, Roboto) unless already mandated by the product.
- Prefer distinctive, high-quality fonts that improve character and clarity.
- Establish a clear typographic hierarchy:
    - Large, expressive headings
    - Highly readable body text
    - Subtle secondary text and labels
- Use deliberate contrasts in size and weight (e.g., light vs. bold).
- All typography changes must be implemented via styling only (CSS, variables, or theme configuration).

### Color & Theme
- Use a cohesive, intentional color palette rather than generic or default schemes.
- Define:
    - A dominant brand color
    - One or two accent colors for emphasis
    - Neutral colors for structure and readability
- Ensure sufficient contrast and compliance with accessibility guidelines (WCAG).
- Apply colors consistently through shared variables or tokens.
- Color changes must not introduce new UI states or alter existing interaction logic.

### Motion & Micro-Interactions
- Use subtle, purposeful motion to enhance clarity and feedback (e.g., hover states, focus transitions).
- Favor simple CSS transitions over complex animations.
- Motion should:
    - Be fast and non-blocking
    - Never delay or interfere with user input
- Avoid excessive or decorative animation.
- Motion enhancements must remain purely visual.

### Backgrounds & Visual Depth
- Prefer layered or textured backgrounds (gradients, soft patterns, depth cues) over flat solid colors.
- Use background treatments to create separation and hierarchy without visual noise.
- Background changes must not:
    - Affect layout calculations
    - Change spacing, sizing, or positioning rules
    - Introduce new interactive surfaces

---

## Responsiveness & Accessibility

- Ensure the UI adapts cleanly across desktop, tablet, and mobile breakpoints.
- Use modern layout techniques (flexbox, grid) where appropriate.
- Maintain or improve keyboard navigation and focus visibility.
- Do not introduce responsiveness logic that changes functional behavior.

---

## Code Integration Guidelines

This skill should guide any UI generation or refactoring process:

1. Apply changes **only** to styling layers (CSS, styled-components, theme files).
2. Do not modify:
    - React component logic
    - Hooks, reducers, or state
    - Event handlers or side effects
3. Prefer incremental, scoped visual changes over large rewrites.
4. Reuse existing components and structure.

### Example Instruction to a UI Generator

```text
Apply visual improvements following the UI Optimization skill:
- Improve typography hierarchy with distinctive fonts
- Refine color palette using existing variables
- Add subtle, non-blocking motion where appropriate
- Enhance background depth

Do not change component logic, behavior, or functionality.