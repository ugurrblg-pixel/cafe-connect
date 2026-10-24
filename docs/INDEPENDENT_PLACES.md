# Bağımsız mekan dizini

## Kapsam ve mevcut durum

Bu altyapı açık mekan verilerini hazırlamak, inceleme kuyruğuna almak ve onaylananları kendi veritabanımızdan aramak içindir. İlk sürüm Türkiye sınır kutusu ve `TR` ülke koduyla sınırlıdır. Kapsam, fotoğraf ve güncellik garantisi vermez.

**Tam bağımsız arama henüz açılmadı.** `INDEPENDENT_PLACES_ENABLED` kapalı kalır. 20 Ekim 2026'da dizin ve hedefli yenileme migration'ları Supabase'e ayrı uygulandı; 809 açık veri kaydı özel inceleme kuyruğuna yazıldı. Hiçbiri otomatik yayınlanmadı. Kaynak/lisans gösterimi için istemci entegrasyonu ve pilot kapsam incelemesi tamamlanmadan bağımsız arama açılmaz. UI'da mevcut Google kaynak açıklaması bağımsız veriye uygulanmamalıdır.

## İlk gerçek karşılaştırma ve hedefli Google sorguları

Pilot kutusu 29.28–29.47 boylam, 40.64–40.85 enlem: Darıca/Gebze ve Yalova taraflarını kapsar. Overture `2026-09-23.1` sürümünden 18.579 ham mekan alındı; uygun kategoriler/lisans/güven eşiği/isim filtresinden 466 kayıt geçti. All the Places'in 343 geçerli zincir kaydıyla toplam **809 aday** kaydedildi; bunların **468'i pilot kutusunda**. Foursquare'in doğrudan güncel veri indirme yolu Places Portal hesabı ve token istiyor; doğrudan indirilmedi. Overture'daki Foursquare kaynaklı 33 aday güven eşiğinden geçmedi. Bu nedenle üç bağımsız sağlayıcının tamamı aktarıldı iddiası yoktur.

Mevcut Google önbelleğinde 126 kayıt okundu. İsim filtresine takılan 17 kayıt karşılaştırma/sorgu kuyruğundan ayrıldı; kalan 109 kayıt üzerinde 18 yakın eşleşme, 1 kategori farkı, açık veri örnekleminde eşleşmeyen 90 Google kimliği bulundu. Pilot açık verideki 449 aday Google önbellek örnekleminde eşleşmedi. Bu, Google'ın bu mekanları içermediğini göstermez; Google Nearby Search örneklemi bütün bölgenin envanteri değildir. Karşılaştırma hiçbir kaydı otomatik birleştirmez veya Google verisiyle açık kaydı düzeltmez.

`private.place_google_review` aday kaydını Google place ID ile ilişkilendirir veya `needs_id` durumunda tutar. `private.targeted_place_refresh` yalnız mevcut Google cafe kimliği/place ID ve iş zamanlaması taşır; Google adı, koordinatı, fotoğrafı burada tutulmaz. 18 eşleşme yenileme dışıdır; 1 fark + 90 Google-only kimlik hedefli kontrol listesinde. Google kimliği olmayan 449 kayıt otomatik ücretli keşif döngüsüne sokulmaz. Kimlik bulma ayrı, bütçeli bir aşamadır; kaynak kimliği Google place ID yerine kullanılamaz.

`GOOGLE_PLACES_TARGETED_ONLY=true` modunda geniş Nearby Search yerine yalnız izin listesindeki, zamanı gelmiş ve kullanıcının arama noktasına 1500m içindeki Google kimliklerine Details çağrısı yapılır. Sunucu kodu ve ayarları 20 Ekim 2026'da güncellendi. `GOOGLE_PLACES_TARGETED_BOUNDS=29.28,40.64,29.47,40.85` geçişi karşılaştırılan pilotla sınırlar; diğer bölgeler mevcut alan önbelleği/kota akışını sürdürür. Sınır ayarı yoksa veya geçersizse geniş sorguya geri dönmek yerine kimlik modu global uygulanır.

Arama başına en çok **2**, hedefli kontrol kuyruğu için proje genelinde UTC takvim günü başına en çok **20** çağrı ayrılır. Bu sınır pilot dışındaki eski arama çağrılarını kapsayan toplam Google faturası garantisi değildir. Lease ve kota rezervasyonu transaction içindedir; tekrar istekler aynı işi alamaz. Başarılı kontrol 7 gün, hata 6 saat ertelenir. Pilot içindeki kota/DB hatası boş kuyruk gibi ele alınır; geniş ücretli aramaya geri dönülmez. Sağlayıcı URL'si/anahtarı yanıt veya hata loglarına yazılmaz.

Google sonucu yalnız mevcut sınırlı önbellek alanlarını yeniler; alınmayan adres/fotoğraf/saat/puan alanları yeni zaman damgasıyla uzatılmaz. Kapanmış/uygunsuz/NOT_FOUND kaydın betimleyici önbelleği boşaltılır, tarihsel cafeId korunur. Kimlik değişimi/redirect otomatik kabul edilmez. Açık veri adaylarının isim/konumları bu işlemle değiştirilmez.

Bu mod **pilot içinde henüz önbelleği olmayan noktalarda boş liste döndürebilir**; pilot dışındaki mevcut keşif korunur. İnceleme kuyruğundaki 809 kayıt otomatik canlı listeye eklenmiş değildir; yerel kapsam, kaynak gösterimi ve geçmiş kimlik devamlılığı incelenmeden tüm Türkiye için tamamlandı denemez.

Tekrarlanabilir araçlar:
```text
python scripts/places/download_overture.py min_lng min_lat max_lng max_lat new-region.jsonl
node scripts/places/compare.ts normalized-open.jsonl temporary-google-cache.json new-report.json
node scripts/places/schedule.ts new-report.json new-schedule.sql
```
İndirme için `duckdb` gerekir; anahtar gerektirmez, en çok bir kare derecelik Türkiye bölgesi kabul eder. Kaynak lisansına göre hazırlama manifestleri ayrılır. Karşılaştırma raporu 24 saat geçerlidir, kimlik ve iş durumu dışında Google içeriği taşımaz. Schedule aracı yalnız operatör SQL'i üretir; kendisi DB'ye yazmaz. Google geçici dışa aktarımı repoya eklenmez ve iş bitiminde kaldırılır; kalıcı envanter yalnız açık kaynak kayıtlarıdır. Detay testi `supabase/tests/targeted_place_refresh.sql` ile lease, istemci yetkisi, tekrar bitirme ve günlük kota sınırını doğrular.

20 Ekim 2026 kontrolünde All the Places'in `2026-10-10-13-32-41` sürümündeki `kahve_dunyasi` örneği indirildi: 355 kayıt, 343 geçerli Point kaydı, 12 Point olmayan/konumsuz kayıt reddi. Hazırlama ve kuru çalışma doğrulandı; canlı yayın sayısı sıfır. Bu tek zincir örneği Türkiye kapsamı veya konum doğruluğu kanıtı değildir. Ham dosya/kişisel iletişim alanları repoya eklenmez. Kaynak: https://alltheplaces-data.openaddresses.io/runs/2026-10-10-13-32-41/output/kahve_dunyasi.geojson

## Veri modeli

- `private.place_candidates`: sağlayıcı + kaynak kimliği + sürüm + içerik parmak izi; normalleştirilmiş, fotoğrafsız kaynak kanıtı. Tekrar aktarım aynı aday kaydını döndürür. Yeni sürüm/çelişkili içerik yeni inceleme adayı oluşturur.
- `private.place_directory`: mevcut `cafes.id` ile değişmeyen Riyo kimliği, seçilmiş kaynak kaydı, konum, görünürlük ve iyimser kilit sürümü.
- `private.place_source_links`: birden fazla sağlayıcı kaydını aynı Riyo kimliğine bağlar. Bir sağlayıcı kimliği iki farklı kafeye atanamaz.
- `private.place_directory_audit`: yayın ve kapatma kararının kim tarafından verildiği, önceki sürüm ve karar zamanı.

Google önbelleği bu tablolara kopyalanmaz. Google kaydının adını/konumunu açık veri diye yeniden etiketlemek yasaktır. İlk yayında mevcut Google kafe kimlikleri otomatik değiştirilmez; check-in, favori ve sohbet kayıtları silinmez. Geçişte aynı fiziksel kafeye ait Google/Riyo kimlikleri ayrıca incelenmelidir; geçmişi taşıma/birleştirme bu sürümde otomatik değildir.

## İçe aktarma ve eşleştirme

1. İlgili sağlayıcıdan yalnız pilot bölgenin verisi alınır. İndirilen sürümün lisansı ve NOTICE dosyaları incelenir; manifestte sağlayıcı, sürüm, lisans, gerekli atıf ve `licenseReviewed` tutulur. Manifest bir hukuk/lisans doğrulama servisi değildir; işletmeci beyanıdır. Overture farklı kaynakları birleştirdiğinden karma lisanslı dosyalar doğru manifestlerle bölünmeli, gerekli tüm bildirimler korunmalıdır.
2. Point koordinatları **boylam/enlem** sırasından çevrilir. Sayısal koordinat, ülke kodu, kategori ve kaynak kimliği doğrulanır. Kaynak fotoğrafı, yorum, telefon ve e-posta aktarılmaz. Geçerli çalışma saati kanıtı yoksa açık/kapalı bilgisi bilinmiyor kalır; sahte puan üretilmez.
3. Overture için güncel `basic_category`/`taxonomy`, eski dosyalar için `categories.primary`; Foursquare OS için açık kategori etiketleri; All the Places için amenity/leisure/shop kullanılır. Şube adı ve açık adres korunur. Bilinmeyen kategori ID'si kafeye dönüştürülmez. Çay evi, çay ocağı, kıraathane, kokoreç ve ızgara isimleri elenir. Overture'da varsa 0,8 altı güven puanı veya geçici kapanma, Foursquare'de çözülmemiş kalite uyarıları otomatik aktarımdan ayrılır; ayrı inceleme gerektirir. 0,8 bir doğruluk yüzdesi değildir, ilk pilot için ayarlanacak temkinli eşiğimizdir. Kaynak şeması değişirse hatalı satırlar rapora düşer.
4. Türkçe isimler normalize edilir; şube numaraları ve ayırt edici kelimeler kaldırılmaz. Aynı **sağlayıcı + kaynak kimliği** rutin güncellemeyi önerir. Ad/kategori değişimi, 100m üzeri konum değişimi veya kapanma bilgisi incelemeye gider.
5. Başka kaynakta **aynı normalize isim + aynı kategori + en çok 25m** varsa birleştirme önerilir. Birden fazla kafe adayı varsa belirsiz sayılır. 120m içinde farklı/benzer kayıtlar da incelemeye gider. 120m çevresinde kayıt yoksa yeni mekan önerilir. Bütün öneriler insan incelemesine tabidir; puan kendiliğinden yazma izni vermez.
6. Aday taraması 0,01 derece hücreler ve komşu hücrelerle yapılır; ülke çapında her kayıt her kayıtla karşılaştırılmaz. Sabit kaynak kimlikleri ayrıca indekslenir. Hazırlama sırasında yeni öneriler henüz onaylı dizine katılmaz; aynı dosyadaki çakışmalar yayın anındaki kilit ve yakınlık kontrolüyle tekrar yakalanır.
7. Gerçek yayın veritabanında transaction + sabit kaynak kimliği + beklenen dizin sürümüyle yapılır. Ad/konum değişiklikleri ayrıca açık kabul ister. Başka kaynağı bağlamak varsayılan olarak seçili ad/konumu değiştirmez. Eski dosyalar yeni kaydın üstüne kendiliğinden yazılmaz.

Overture, Foursquare ve All the Places tamamen bağımsız kanıtlar değildir: Overture diğer ikisini de içerebilir. İki yerde görünmesi otomatik doğruluk veya ayrı iki oy sayılmaz. GERS köprüleri/kaynak ID değişimleri otomatik eşlenmez; yeni kimlik olarak incelemeye girer.

## Hazırlama araçları (Node 24)

Girdi satır başına bir GeoJSON Feature (Overture/ATP) veya bir Foursquare OS JSON kaydıdır; ülke çapında büyük GeoJSON FeatureCollection dosyası doğrudan verilmez. `snapshot.json`, onaylı dizindeki kaynak bağlantılarının `PlaceRecord` alanları ve `cafeId` içeren dizisidir; ilk pilot için `[]` olabilir.

```text
node scripts/places/prepare.ts manifest.json region.jsonl snapshot.json proposals.jsonl
node scripts/places/stage.ts proposals.jsonl
```

İlk komut ağ isteği veya veritabanı yazması yapmaz, yeni çıktı dosyası ister. İkinci komut varsayılan olarak yalnız doğrular. En çok 1000 kayıtlık küçük, incelenebilir partiler kullanılmalı.

Sunucu ortamında `SUPABASE_URL` ve `SUPABASE_SERVICE_ROLE_KEY` güvenli biçimde ayarlandıktan sonra `stage.ts proposals.jsonl --stage` yalnız aday kuyruğuna yazar; **hiçbir kaydı yayınlamaz**. Bu anahtarlar tarayıcıya, VITE değişkenlerine, repoya veya rapora konulmaz. Hata halinde tamamlanan adaylar kalabilir; aynı partiyi yeniden çalıştırmak güvenlidir. Dışarıdan gelen öneri dosyasındaki cafeId/karar bilgisi SQL yayın yetkisi sayılmaz.

## Veritabanı kurulumu ve yayın

`20261019010000_independent_place_directory.sql` ve `20261020010000_targeted_place_refresh.sql` migration'ları ayrı incelenip uygulanır. Bu projenin eski migration geçmişi henüz uzlaştırılmadığından **toplu db push yapılmaz**. RLS tabloları ve RPC'ler anonim/giriş yapan uygulama kullanıcılarına kapalı; RPC yürütmesi yalnız service_role içindir. Yeni bir kullanıcıya veya moderatöre servis anahtarı verilmez. İlk yönetim güvenilir sunucu/SQL operatör akışıdır; admin inceleme ekranı bu sürüme dahil değildir.

`stage_independent_place` aday kimliği/parmak izini döndürür. Güvenilir operatör `publish_independent_place` ile aday/parmak izi/inceleyen bilgilerini verir. Yeni kayıt için hedef boş; bağlama/güncelleme için hedef mevcut bağımsız dizin cafeId'si ve beklenen sürüm olmalıdır. Google-only veya rastgele cafeId'ye bağlama reddedilir. `p_replace_canonical` seçili alanların değişmesini, `p_accept_material_change` ciddi değişikliğin ayrıca kabulünü sağlar. Aynı adayın tekrar yayını yeni cafe yaratmaz. Ayrı komşu şube oluşturmak da açık inceleme ister.

Kapatma/saklama `set_independent_place_state` ile beklenen sürüme karşı yapılır. Kaynağın yeni dosyasında görünmemek tek başına kapanma değildir. Kapanan mekanın geçmiş check-in ve sohbetleri silinmez. Kaynak yokluğu, eski kayıtlar ve işletme düzeltmeleri için periyodik inceleme raporu hazırlanmalı; bu sürüm arka planda otomatik indirme/cron kurmaz.

## Kendi veritabanımızdan yakınlık araması

`search_independent_places` önce indeksli sınır kutusuyla daraltır, sonra Haversine ile gerçek yarıçap filtresi uygular; mesafe ve sabit kimliğe göre en yakın 200 onaylı/aktif kayıt döner. Varsayılan yarıçap 1500m, izin verilen üst sınır 5000m. Arama koordinatları veritabanına veya loga yazılmaz. Çalışma saati ve anlık açık olma bilgisi uydurulmaz. Kaynak/lisans/atıf her sonuçta korunur.

Sunucu anahtarı açıldığında `nearby-cafes` önce kullanıcı oturumunu doğrular, yalnız bu RPC'yi çağırır; Google'a gitmez ve ücretli kota ayırmaz. Boş bölge boş döner; veritabanı hatasında sessizce ücretli Google çağrısı yerine 503 döner. Katılım sayısı yalnız dönen mekan kimlikleri için okunur.

## Geçiş kapıları

1. İzole SQL testleri ve algoritma testleri geçmeli.
2. Gerçek pilot bölgede kaynak başına kabul/ret/mükerrer oranı, eksik bilinen kafeler, hatalı konumlar ve kapanmış işletmeler örneklenmeli. İçe aktarılan kayıt sayısı tek başına kapsam kanıtı değildir.
3. Eski Google cafeId ile yeni kayıtlar arasındaki devamlılık ve mükerrer kartlar incelenmeli; geçmiş veriyi otomatik taşımadan önce ayrı plan hazırlanmalı.
4. İstemci bağımsız kaynak tipini tanımalı, gerekli kaynak ve lisans açıklamalarını göstermeli; boş bölgeyi dürüstçe açıklamalı. Fotoğraflar kullanıcı/işletme izniyle ayrı eklenmeli.
5. Bunlar tamamlanınca migration + işlev deploy edilir, küçük bölgeyle kontrollü geçiş yapılır. Mevcut anahtar globaldir; bölgesel kontrollü geçiş için ayrıca bölge politikası eklenmeden global açılmaz. Geri dönüşte flag kapatılır; onaylı dizin ve geçmiş silinmez.

## Doğrulama

`src/test/placeDirectory.test.ts`: Türkçe normalizasyon, uygunsuz kaynak/lisans, yanlış koordinat, kategori, komşu şube, kimlik, kaynak adaptörleri ve hücre sınırları.
`src/test/placesCache.test.ts`: bağımsız modda sıfır Google isteği, boş sonuç, oturum ve hata davranışı; mevcut Google akışının regresyonu.
`supabase/tests/independent_place_directory.sql`: izole PostgreSQL'de transaction içinde staging/yayın tekrarları, uzaklık, yetki, isim değişikliği, eski sürüm, kapanma ve alan kontrolleri. Test verileri rollback edilir. Bu test canlı Supabase uçtan uca doğrulaması yerine geçmez.

Resmi şemalar/lisans bilgileri:
- https://docs.overturemaps.org/guides/places/
- https://docs.overturemaps.org/attribution/
- https://docs.foursquare.com/data-products/docs/places-os-data-schema
- https://docs.foursquare.com/data-products/docs/fsq-places-open-source
- https://github.com/alltheplaces/alltheplaces/blob/master/DATA_FORMAT.md
- https://github.com/alltheplaces/alltheplaces#license


## OpenStreetMap pilotu — 20 Ekim 2026

OpenStreetMap Overpass üzerinden aynı pilot kutusunda 90 kayıt alındı. 31 isimsiz ve 3 uygunsuz isimli kayıt reddedildi; 56 kayıt `private.osm_place_candidates` tablosunda bekliyor. Diğer 468 açık kaynak adayına göre 2 güçlü bağlama önerisi, 37 yakınlık/belirsizlik incelemesi, 17 yeni kayıt önerisi var. Bunlar ayrı mekan sayısı veya otomatik birleştirme sonucu değildir.

Güncel Google önbelleğindeki 109 uygun kayıtla karşılaştırmada 1 eşleşme ve örneklemde eşleşmeyen 55 OSM kaydı bulundu. Eşleşmeyen kayıtlar Google'da yok demek değildir. Eşleşen bir kimlik yenileme kuyruğundan çıkarıldı; bilinmeyen 55 kayıt için ücretli keşif başlatılmadı. Önceki kaynakların eşleşmeleri OSM örnekleminde bulunmadıkları için yeniden sorguya alınmaz.

OSM kimlikleri `node/`, `way/`, `relation/` olarak ayrılır. Way/relation merkezleri giriş noktası değildir ve inceleme gerektirir. Ülke etiketi yoksa yalnız sabit Türkiye pilot kutusunda TR kabul edilir. Kayıt sürümü Overpass `timestamp_osm_base` değeridir; kişi/editör verileri ve iletişim alanları tutulmaz.

OSM verileri ODbL-1.0 lisanslıdır; CC0/CDLA olarak etiketlenmez. Ayrı inceleme tablosu ve `stage_osm_place` kullanılır. Mevcut bağımsız yayın RPC'si OSM adaylarını kabul etmez. Kullanıcıya sunum/dağıtım öncesinde OSM atfı ve türetilmiş veritabanı paylaşım yükümlülükleri değerlendirilmelidir. Karşılaştırma Google içeriğini OSM kaydına taşımaz. Kaynak: https://www.openstreetmap.org/copyright

`node scripts/places/download_osm.ts new-pilot.jsonl` yalnız operatörün başlattığı küçük pilot indirmesidir; her konum isteğinde çalışmaz. Ücretsiz Overpass hizmeti kesilebilir; hatalı/kısmi yanıt içe aktarılmaz. Sonraki adım `prepare.ts` ve `stage.ts` araçlarıdır. OSM SQL migration'ları `20261020020000_osm_place_review.sql`, `20261020030000_osm_google_review.sql`; uygulama kullanıcılarına erişim açmaz. Test: `supabase/tests/osm_place_review.sql`.

## İncelenen ek mekan pilotu — 21 Ekim 2026

İlk ek parti 11 Overture kaydıdır: Balyanoz Cafe, EspressoPark - Darıca Kocaeli, N and Nehir Cafe, Elif Butik Cafe ve Hobi Evi, Tarçın Bistro Cafe, Fun & Fam Cafe, Dörtyol Cafe, caferozz, Trend Cafe, Coffee-QR ve MinikCafe. Kaynak/kategori/isim ve mükerrer olasılığı masa başında incelendi; yerinde işletme doğrulaması yapıldığı iddia edilmez. Aynı isimli yakın Starbucks şubesi belirsizliği ayrıldı; dernek/büfe ve belirsiz kategoriler eklenmedi.

Mevcut Google kayıtlarından 200m uzaklık ve açık adaylardan 120m ayrılık tarandı; 2km içinde aynı normalize isimli açık kaynak kayıtları ayrıldı. Veritabanındaki `publish_reviewed_pilot_place` kimlik/parmak izi, bölge/kategori ve Google ile 120m/aynı isim 2km çakışmasını tekrar denetler. Google kimliği olan cafe satırları değiştirilmez. Her açık kaynak yeni sabit cafeId alır; check-in ve sohbet geçmişi taşınmaz/silinmez. Bu ilk parti kullanıcı yetkilendirmesiyle Codex kaynak incelemesi olarak audit edilir; sahada insan doğrulaması değildir.

`20261021010000_reviewed_venue_projection.sql` kaynak, atıf, lisans ve onay durumunu mevcut cafes tablosuna yansıtır. Listede bu onaylı kayıtlar sınırlı Google cache ile birlikte döner; tam bağımsız mod kapalı kalır. Google önbelleği 28 gün sınırını sürdürür; onaylı açık kayıtların varlığı Google cache süresini uzatmaz. Gizlenen/kapanan dizin kaydının yansıtılan onayı kaldırılır; arama ve arayüzden ayrılır. Yeni bir kişiye erişim/rol verilmez. OSM kayıtları ayrı inceleme tablolarında bekler ve bu partiye dahil değildir.

`VenueSources` kaynak/lisans açıklamasını Discover ve CafeRoom üzerinde paylaşır. Kart kaynak adı ve açılır ayrıntılar gerçek sağlayıcıya göre gösterilir; Google açıklaması bağımsız kayda uygulanmaz. İstemci bellek önbelleği ve kota fallback bu alanları korur. Açık/kapalı, puan, gerçek mekan fotoğrafı veya işletme doğrulaması uydurulmaz. Mevcut temsili görseller gerçek mekan fotoğrafı olarak doğrulanmış değildir.

## Otomatik kaynak eşleştirme bağlantısı — 24 Ekim 2026

`adopt_matching_open_sources` sunucu oturum kontrolünden sonra çalışmak üzere hazırlandı. Pilot içinde içe aktarılmış Overture/All the Places kayıtlarıyla aynı normalize isim, aynı kategori, en çok25m ve her iki yönde tekil kimlik ister; en çok10 kayıt işler. OSM/ODbL kayıtları ayrı yayın incelemesinde kalır. Her aramada dış sağlayıcılardan tekrar veri indirmez; mevcut kaynak havuzunu kullanır. Yeni bölge kaynaklarının aktarımı ayrı operatör işidir.

Açık kaynağın kendi adı/adresi/koordinatları kaydedilir. Mevcut cafeId ve Google place ID korunur; eski Google açıklama/fotoğraf/puan alanları taşınmaz. Google kimliği yalnız kimlik devamlılığı içindir. Kaynak atfı ve lisansı korunur, hedefli Google yenileme işi iptal edilir. Daha önce başlamış bir Google güncellemesine karşı projection trigger bağımsız alanları korur. Bu kayıtlar eski place_directory yerine private.google_source_adoptions üzerinden bağlıdır; tam bağımsız RPC moduna ileride ayrıca dahil edilmelidir. İptal/kapama yönetimi operatör incelemesi gerektirir.

Canlıya geçiş henüz doğrulanmadı: tarayıcı bağlantısı kapalıyken migration veya işlev deploy edildiği iddia edilmez. Yeni SQL testi yalnız izole test veritabanında çalıştırılır.
