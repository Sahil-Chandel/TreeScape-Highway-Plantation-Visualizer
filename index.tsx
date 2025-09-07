/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";

// --- DOM Element References ---
const imageUpload = document.getElementById('image-upload') as HTMLInputElement;
const imagePreview = document.getElementById('image-preview') as HTMLImageElement;
const uploadPlaceholder = document.getElementById('upload-placeholder') as HTMLDivElement;
const promptInput = document.getElementById('prompt-input') as HTMLTextAreaElement;
const generateBtn = document.getElementById('generate-btn') as HTMLButtonElement;
const resultContainer = document.getElementById('result-container') as HTMLDivElement;
const resultPlaceholder = document.getElementById('result-placeholder') as HTMLParagraphElement;
const resultImage = document.getElementById('result-image') as HTMLImageElement;
const loader = document.getElementById('loader') as HTMLDivElement;

// --- State Management ---
let selectedFile: File | null = null;
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

// --- Helper Functions ---

/**
 * Converts a File object to a GoogleGenAI.Part object.
 * @param file The file to convert.
 * @returns A promise that resolves to the Part object.
 */
function fileToGenerativePart(file: File): Promise<{ inlineData: { data: string; mimeType: string; } }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const base64Data = result.split(',')[1];
      if (base64Data) {
        resolve({
          inlineData: {
            data: base64Data,
            mimeType: file.type,
          },
        });
      } else {
        reject(new Error("Failed to read file as base64."));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Toggles the visibility of the loader and the disabled state of the UI.
 * @param isLoading Whether the loading state should be active.
 */
function setLoading(isLoading: boolean) {
  if (isLoading) {
    loader.classList.remove('hidden');
    generateBtn.disabled = true;
    promptInput.disabled = true;
    imageUpload.disabled = true;
  } else {
    loader.classList.add('hidden');
    generateBtn.disabled = !selectedFile;
    promptInput.disabled = false;
    imageUpload.disabled = false;
  }
}

/**
 * Displays an error message in the result panel.
 * @param message The error message to display.
 */
function displayError(message: string) {
  resultImage.style.display = 'none';
  resultPlaceholder.style.display = 'block';
  resultPlaceholder.textContent = `Error: ${message}`;
  resultPlaceholder.style.color = 'var(--error-color)';
}


// --- Event Listeners ---

/**
 * Handles the change event for the file input.
 * Reads the selected file, displays a preview, and updates the state.
 */
imageUpload.addEventListener('change', () => {
  const files = imageUpload.files;
  if (files && files.length > 0) {
    selectedFile = files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.src = e.target?.result as string;
      imagePreview.style.display = 'block';
      uploadPlaceholder.style.display = 'none';
      generateBtn.disabled = false;
    };
    reader.readAsDataURL(selectedFile);
  }
});

/**
 * Handles the click event for the generate button.
 * Triggers the AI image generation process.
 */
generateBtn.addEventListener('click', async () => {
  if (!selectedFile) {
    displayError("Please upload an image first.");
    return;
  }
  const prompt = promptInput.value.trim();
  if (!prompt) {
    displayError("Please enter a prompt.");
    return;
  }

  setLoading(true);
  resultPlaceholder.style.display = 'none';
  resultImage.style.display = 'none';

  try {
    const imagePart = await fileToGenerativePart(selectedFile);
    const textPart = { text: prompt };

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: { parts: [imagePart, textPart] },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    let foundImage = false;
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const base64ImageBytes: string = part.inlineData.data;
        const mimeType = part.inlineData.mimeType;
        resultImage.src = `data:${mimeType};base64,${base64ImageBytes}`;
        resultImage.style.display = 'block';
        foundImage = true;
        break; 
      }
    }

    if (!foundImage) {
        displayError("The model did not return an image. Please try a different prompt.");
    }

  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    displayError(errorMessage);
  } finally {
    setLoading(false);
  }
});

// --- Initialization ---
function initializeApp() {
    promptInput.value = "Show the same highway after 10 years, with the planted trees fully grown, maintaining the same positions, perspective, and lighting";
}

initializeApp();