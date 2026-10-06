// Bord ondulé du bandeau bleu : reprend la vague de la carte posée sur le comptoir.
export default function Wave() {
  return (
    <svg className="band-wave" viewBox="0 0 800 60" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path d="M0 60V28C120 4 240 4 400 24s300 24 400 0v36z" />
    </svg>
  );
}
