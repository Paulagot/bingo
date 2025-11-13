/**
 * Message Generation Utilities
 */

export interface StatusMessage {
  tone: 'ready' | 'warning';
  message: string;
}

/**
 * Get current status message based on configuration completeness
 */
export function getCurrentMessage(configComplete: boolean): StatusMessage {
  if (!configComplete) {
    return {
      tone: 'warning',
      message:
        "Please review your configuration carefully. If anything looks off, use Back to make changes. Once launched, you can't change the basic quiz structure.",
    };
  }
  return {
    tone: 'ready',
    message:
      "Everything looks good! Review your configuration below one last time. After launching, the quiz structure can't be modified.",
  };
}

