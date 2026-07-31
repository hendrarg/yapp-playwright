/** Navigation / unsaved-warning data for consultation create (AUT-FV-019). */
export const consultationNavigationData = {
  mobileViewport: { width: 390, height: 844 } as const,
  unsavedTitlePrefix: "AUT-FV-019",
  unsavedDescription: "Unsaved consultation navigation check",
  nextCtaName: "Next: Set Availability",
  backButtonName: "Back",
  unsavedDialogPattern: /unsaved|leave|discard|save your changes|are you sure|lose your changes/i,
} as const;
