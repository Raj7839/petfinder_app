import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';

let model: mobilenet.MobileNet | null = null;

/**
 * Initialize and load the MobileNet model
 */
export async function loadModel() {
  if (model) return model;
  
  try {
    // Ensure tfjs is ready
    await tf.ready();
    // Load MobileNet (using the smaller model for faster browser performance)
    model = await mobilenet.load({ version: 2, alpha: 1.0 });
    console.log('MobileNet model loaded successfully');
    return model;
  } catch (error) {
    console.error('Error loading MobileNet model:', error);
    throw error;
  }
}

/**
 * Extract an image feature embedding (a 1D array of numbers) from an HTML Image Element.
 * We use the internal infer method of mobilenet to get the activation from a lower layer.
 */
export async function extractFeatures(imgElement: HTMLImageElement | HTMLCanvasElement): Promise<number[]> {
  const loadedModel = await loadModel();
  
  // Tidy cleans up the WebGL memory used by intermediate tensors
  const embedding = tf.tidy(() => {
    // Get the activation from the model. 
    // This returns a tensor of shape [1, 1024]
    const activation = loadedModel.infer(imgElement, true);
    return activation;
  });

  // Convert the tensor to a standard JavaScript array
  const featuresArray = await embedding.array() as number[][];
  
  // Dispose of the tensor to prevent memory leaks
  embedding.dispose();

  // The shape is [1, N], so we return the first row.
  return featuresArray[0];
}

/**
 * Compute the cosine similarity between two feature vectors.
 * Returns a value between 0 and 1, where 1 means identical.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must be of the same length');
  }

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Helper to get a percentage match (0-100)
 */
export function getMatchPercentage(vecA: number[], vecB: number[]): number {
  const sim = cosineSimilarity(vecA, vecB);
  return Math.max(0, Math.min(100, Math.round(sim * 100)));
}
