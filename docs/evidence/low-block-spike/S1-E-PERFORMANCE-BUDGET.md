# S1-E — Performance budget

At the 400-column render width, the spike allocates six preallocated typed arrays totaling approximately 5.2 KB. It keeps the existing 80-step DDA bound, adds one continued traversal only after a low hit, and uses no `getImageData`, `getImageData`-like extraction, per-column objects, or recurring typed-array allocation.

Automated checks can prove allocation/readback absence and bounded data size. The under-10% Android Chrome cost remains a physical-device gate.
