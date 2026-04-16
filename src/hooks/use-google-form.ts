"use client";

import { useState } from "react";

/**
 * Configuration for a Google Form integration.
 * Maps frontend field names to Google Form entry IDs.
 */
export interface GoogleFormConfig {
  /** The Google Form ID (found in the form URL between /d/ and /edit) */
  formId: string;
  /** Map of your field names to Google Form entry IDs (e.g., { name: "entry.123456" }) */
  entryIds: Record<string, string>;
}

/**
 * Generic hook for submitting forms to Google Forms.
 * Works with any form structure - just configure your field mappings.
 *
 * @example
 * ```tsx
 * // For a contact form
 * const config = {
 *   formId: "1FAIpQLSd...",
 *   entryIds: { name: "entry.123", email: "entry.456", message: "entry.789" }
 * };
 * const { isSubmitting, isSubmitted, submitForm } = useGoogleForm(config);
 *
 * // For an RSVP form
 * const config = {
 *   formId: "1FAIpQLSd...",
 *   entryIds: { name: "entry.111", email: "entry.222", attending: "entry.333", guests: "entry.444" }
 * };
 * ```
 */
export function useGoogleForm(config: GoogleFormConfig) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  /**
   * Submit form data to Google Forms.
   * @param data - Object with keys matching your entryIds config
   */
  const submitForm = async (
    data: Record<string, string | number | boolean>,
  ) => {
    setIsSubmitting(true);

    const formUrl = `https://docs.google.com/forms/d/${config.formId}/formResponse`;
    const formData = new URLSearchParams();

    // Dynamically map data keys to Google Form entry IDs
    for (const [key, value] of Object.entries(data)) {
      const entryId = config.entryIds[key];
      if (entryId) {
        formData.append(entryId, String(value));
      }
    }

    try {
      // Using no-cors mode because Google Forms doesn't support CORS
      // This means we can't read the response, but the submission will still work
      const response = await fetch(formUrl, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        throw new Error(
          `Form submission failed with status ${response.status}`,
        );
      }

      setIsSubmitted(true);
      return true;
    } catch (error) {
      console.error("Form submission error:", error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Reset the submitted state (e.g., to allow resubmission or clear success message).
   */
  const resetForm = () => {
    setIsSubmitted(false);
  };

  return {
    isSubmitting,
    isSubmitted,
    submitForm,
    resetForm,
  };
}
