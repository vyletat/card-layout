import { useImageUrl } from '../../hooks/useImageUrl';

/** Renders a stored image as a contained thumbnail, or a neutral placeholder if missing. */
export function Thumbnail({
  imageId,
  className,
}: {
  imageId: string | null;
  className?: string;
}) {
  const url = useImageUrl(imageId);
  if (!imageId || !url) {
    return <div className={`thumb-empty ${className ?? ''}`} />;
  }
  return <img src={url} alt="" className={`thumb-img ${className ?? ''}`} draggable={false} />;
}
