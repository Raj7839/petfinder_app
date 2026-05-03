import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';

let model: mobilenet.MobileNet | null = null;

async function init() {
  if (model) return;
  await tf.ready();
  // In workers, we typically use the CPU backend or WebGL if supported via OffscreenCanvas
  // but for broad compatibility in workers, CPU or WASM is safer.
  // However, TFJS can try to use WebGL in workers in some browsers.
  await tf.setBackend('cpu'); 
  model = await mobilenet.load({ version: 2, alpha: 1.0 });
  self.postMessage({ type: 'READY' });
}

self.onmessage = async (e: MessageEvent) => {
  const { type, payload, id } = e.data;

  if (type === 'INIT') {
    await init();
  } else if (type === 'EXTRACT_FEATURES') {
    if (!model) {
      await init();
    }
    
    try {
      const { imageData } = payload;
      // Convert ImageData back to a tensor
      const tensor = tf.browser.fromPixels(imageData);
      
      // Run inference
      const embedding = tf.tidy(() => {
        return model!.infer(tensor, true);
      });
      
      const features = await embedding.array() as number[][];
      embedding.dispose();
      tensor.dispose();

      self.postMessage({ type: 'FEATURES_EXTRACTED', payload: features[0], id });
    } catch (err: any) {
      self.postMessage({ type: 'ERROR', payload: err.message, id });
    }
  }
};
