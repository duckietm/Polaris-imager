const unavailable = async () => {
    throw new Error('wasm-webp is not bundled in the avatar-imaging harness');
};

export const decodeAnimation = unavailable;
export const decodeRGBA = unavailable;

export default { decodeAnimation, decodeRGBA };
