export interface VenueSource { dataSource?: string | null; attribution?: string | null; license?: string | null }
const sources: Record<string,{name:string;url:string}> = {
 google:{name:'Google Maps',url:'https://maps.google.com/'},
 overture:{name:'Overture Maps',url:'https://docs.overturemaps.org/attribution/'},
 alltheplaces:{name:'All the Places',url:'https://www.alltheplaces.xyz/'},
 openstreetmap:{name:'OpenStreetMap',url:'https://www.openstreetmap.org/copyright'},
 foursquare_os:{name:'Foursquare',url:'https://docs.foursquare.com/data-products/docs/fsq-places-open-source'},
};
const licenses:Record<string,string>={
 'CDLA-Permissive-2.0':'https://cdla.dev/permissive-2-0/',
 'CC0-1.0':'https://creativecommons.org/publicdomain/zero/1.0/',
 'Apache-2.0':'https://www.apache.org/licenses/LICENSE-2.0',
 'ODbL-1.0':'https://opendatacommons.org/licenses/odbl/1-0/',
};
export function venueSourceName(source?:string|null) { return sources[source || 'google']?.name || 'Mekan kaydı'; }
export function VenueSources({venues}:{venues:VenueSource[]}) {
 const unique=[...new Map(venues.map(v=>[`${v.dataSource || 'google'}:${v.license || ''}:${v.attribution || ''}`,v])).values()];
 if(!unique.length)return null;
 return <details className="mb-4 text-xs text-muted-foreground">
   <summary className="cursor-pointer rounded-sm py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">Mekan verileri ve kaynaklar</summary>
   <ul className="mt-1 space-y-3 break-words">
    {unique.map((v,i)=>{const source=sources[v.dataSource || 'google'];return <li key={i}>
      {source ? <a className="underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" href={source.url} target="_blank" rel="noopener noreferrer" translate="no">{source.name}</a> : 'Mekan kaydı'}
      {v.attribution && <p className="mt-1">{v.attribution}</p>}
      {v.license && (licenses[v.license] ? <a className="mt-1 inline-block underline underline-offset-2" href={licenses[v.license]} target="_blank" rel="noopener noreferrer">Lisans: {v.license}</a> : <p>Lisans: {v.license}</p>)}
    </li>;})}
   </ul>
 </details>;
}
