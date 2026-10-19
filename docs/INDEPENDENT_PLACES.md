# Bağımsız mekan dizini

## Kapsam ve mevcut durum

Bu altyapı açık mekan verilerini hazırlamak, inceleme kuyruğuna almak ve onaylananları kendi veritabanımızdan aramak içindir. İlk sürüm Türkiye sınır kutusu ve `TR` ülke koduyla sınırlıdır. Kapsam, fotoğraf ve güncellik garantisi vermez.

**Canlı Google araması henüz kapatılmaz.** Kodun sunucudaki `INDEPENDENT_PLACES_ENABLED` anahtarı varsayılan olarak kapalıdır. Gerçek mekanlar canlıya aktarılmadı; bu migration canlıya uygulanmış sayılmaz. Kaynak/lisans gösterimi için istemci entegrasyonu ve pilot kapsam incelemesi tamamlanmadan anahtar açılmaz. UI'da mevcut Google kaynak açıklaması bağımsız veriye uygulanmamalıdır.

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

Yalnız `20261019010000_independent_place_directory.sql` migration'ı ayrı incelenip uygulanmalıdır. Bu projenin eski migration geçmişi henüz uzlaştırılmadığından **toplu db push yapılmaz**. RLS tabloları ve RPC'ler anonim/giriş yapan uygulama kullanıcılarına kapalı; RPC yürütmesi yalnız service_role içindir. Yeni bir kullanıcıya veya moderatöre servis anahtarı verilmez. İlk yönetim güvenilir sunucu/SQL operatör akışıdır; admin inceleme ekranı bu sürüme dahil değildir.

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
