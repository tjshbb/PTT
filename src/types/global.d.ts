// Make the Google Maps JS API (loaded at runtime via <script>) available on the
// window object for TypeScript. The `google` namespace itself comes from
// @types/google.maps.
export {};

declare global {
  interface Window {
    google?: typeof google;
  }
}
