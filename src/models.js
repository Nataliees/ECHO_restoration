import { GLTFLoader } from '../assets/vendor/GLTFLoader.js';

const templates = new Map();
export const modelNames = ['recovery-bed', 'archive-desk', 'service-console', 'radio', 'task-lamp'];

export async function preloadModels() {
    const loader = new GLTFLoader();
    await Promise.all(modelNames.map(async name => {
        const {scene} = await loader.loadAsync(new URL(`../assets/models/${name}.glb`, import.meta.url).href);
        templates.set(name, scene);
    }));
}

export function makeModel(name, position = [0, 0, 0]) {
    const template = templates.get(name);
    if (!template) throw new Error(`Model not loaded: ${name}`);
    const model = template.clone(true);
    model.name = `model-${name}`;
    model.position.set(...position);
    // Level cleanup owns these copies; cached templates remain reusable.
    model.traverse(node => {
        if (!node.isMesh) return;
        node.geometry = node.geometry.clone();
        node.material = node.material.clone();
        node.castShadow = node.receiveShadow = true;
    });
    return model;
}
