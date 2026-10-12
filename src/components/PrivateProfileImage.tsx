import { usePrivatePhoto } from '@/hooks/usePrivatePhoto';

export function PrivateProfileImage({ src, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) {
  const resolved = usePrivatePhoto(src || '');
  return <img {...props} src={resolved || '/placeholder.svg'} />;
}
