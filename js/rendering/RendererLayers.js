export const FIELD_RENDER_ORDER = ['electric', 'magnetic', 'device'];

export function forEachFieldRenderLayer(scene, callback) {
    for (const key of FIELD_RENDER_ORDER) {
        const objects = Array.isArray(scene?.objects) ? scene.objects : [];
        for (const object of objects) {
            callback(key, object);
        }
    }
}
