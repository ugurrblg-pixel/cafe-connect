const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const referencePattern = new RegExp(`^cafephoto:(${UUID}):(${UUID}/${UUID}\\.webp)$`, 'i');
export function cafePhotoReference(cafeId: string, avatarReference: string): string | null {
 const value=`cafephoto:${cafeId}:${avatarReference.replace(/^avatar:/,'')}`;
 return avatarReference.startsWith('avatar:') && referencePattern.test(value)?value:null;
}
export function parseCafePhoto(reference: string): {cafeId:string;photoPath:string}|null {
 const match=referencePattern.exec(reference);
 return match?{cafeId:match[1],photoPath:match[2]}:null;
}
