# Google Places bağımsızlığı: araştırma ve algoritma kararı

30 Ekim 2026. Bu belge yeni üretim davranışı veya veri yayını değildir. Araştırma, kaynak kodu incelemesi ve canlıda yalnız toplu sayım yapıldı.

## Canlı başlangıç ölçümü

| Ölçüm | Adet |
|---|---:|
| Google kaynaklı tüm cafe satırları | 175 |
| Son 28 gün içindeki Google satırları | 170 |
| Onaylı bağımsız cafe satırları, Overture | 24 |
| Bunların eski cafe kimliği korunarak kaynak eşleştirmesiyle alınanları | 13 |
| Ayrı bağımsız dizin satırları | 11 |
| Bekleyen Overture adayları, tüm aktarılmış bölge | 455 |
| Bekleyen AllThePlaces adayları, tüm aktarılmış bölge | 343 |
| Pilot kutusunda bekleyen adaylar | 457 |
| Pilot kutusunda henüz kaynak eşleştirmesiyle kullanılmayan adaylar | 444 |

Pilot kutusu: boylam 29.28–29.47, enlem 40.64–40.85. Bekleyenler benzersiz, açık veya doğrulanmış işletme sayısı değildir. Kaynak eşleştirmeleri adayın pending durumunu değiştirmediğinden 13 kayıt hem bekleyen havuzunda hem eşleştirme tablosunda sayılır. Ülke/bölge kapsam yüzdesi bu rakamlardan hesaplanamaz. Google Nearby Search sonucu da eksiksiz bir referans liste değildir.

## Kodda bağımsızlığı geciktiren noktalar

1. `nearby-cafes` tam bağımsız modu global environment bayrağıyla açılıyor. Bölge bazlı geçiş henüz yok. Bir bölgede yeterli veri olması global bayrak için yeterli değildir.
2. `search_independent_places` bağımsız dizinden okuyor; 13 kaynak eşleştirmesi `google_source_adoptions` üzerinden cafe tablosuna yansıyor. Global moda geçmeden bu iki onaylı yol tek arama izdüşümünde birleştirilmeli; eski cafeId korunmalı.
3. Kaynak eşleştirmesi 1500m ile sınırlı; kullanıcı listesi 2000m. Pilot kutusu ve tarama sınırları da korunarak aynı kapsama getirilmeli.
4. Otomatik eşleştirme sadece Overture/ATP ve CDLA/CC0 alıyor. Foursquare OS/Apache-2.0 yolu hazırlama aracında var ama canlı eşleştirme SQL'inde yok. Yeni kaynağı desteklemeden veri indirmek yeterli olmaz.
5. Her aramada sadece havuzdaki adaylarla karşılaştırma yapılıyor; yeni açık veri bölgesi otomatik indirilmiyor. Dış veri alımını kullanıcı isteğinin beklediği akışa eklememeli.
6. Kaynak eşleştirmesi aynı ad + kategori + 25m + çift yönlü tekillik istiyor. Bunu körlemesine 100–200m'ye genişletmek komşu zincir şubelerini karıştırır. Yakın ama belirsiz kayıtlar ayrı incelemeye yönlenmeli.

## Kaynak sırası

1. **Mevcut 444 pilot adayı:** hemen inceleme/çakışma raporu. Hesap, indirme veya yeni ücret gerektirmez. En hızlı ilk iş budur.
2. **Güncel Overture bölge dosyası:** resmi araçla yalnız ihtiyaç duyulan bölgeyi indir. Yayın kimliği ve kaynak lisansını sabitle. Mevcut aktarım ile yeni sürümü kaynak kimliği üzerinden karşılaştır. Kategori uyumunu ve reddedilme nedenlerini raporla; güven puanını kapsam için gelişigüzel düşürme.
3. **AllThePlaces:** zincir işletmelerin şube verisi için tamamlayıcı. Kahve Dünyası için gerçek spider mevcut. Overture içinde de ATP bulunduğundan aynı kaydı bağımsız ikinci doğruluk oyu sayma.
4. **Foursquare OS:** ayrı bölgesel örnekte gerçekten yeni ve kullanılabilir kayıt kazandırıyorsa ekle. Resmi erişim Places Portal hesabı ve token istiyor; bu araştırmada erişim veya indirme yapılmadı. Overture da FSQ içerdiği için net kazanım ölçülmeli. Ücretli Places API ile ücretsiz OS veri setini karıştırma.
5. **Kullanıcı ve işletme katkısı:** açık verilerde bulunmayan küçük yerel kafeleri tamamlar. Mekan adı, pin, kategori ve işletmenin kendi izinli kanıtı alınır; profil doğrulamasından ayrı mekan incelemesi yapılır. Tek kullanıcı bildirimiyle otomatik yayın veya kapanma olmaz.
6. **OSM:** ayrı lisans ve atıf kurallarıyla tamamlayıcı; mevcut pilot adayları yayına dahil sayılmaz. Tüm bağımsızlık işini OSM kapsamına bağlama.

## Yeni algoritma, uygulama sırası

### A. Veri işleme hattı

Kaynak dosyası → sürüm/lisans/ülke/koordinat/kategori doğrulama → sabit kaynak kimliği → mevcut kimlikle değişiklik kontrolü → mekansal aday taraması → mükerrer/şube ayrımı → operatör incelemesi → onaylı tek mekan izdüşümü.

- Aynı kaynak kimliğinde ad, kategori, önemli konum değişikliği veya kapanma: inceleme.
- Yeni kaynak kimliği, aynı normalize ad ve kategori, 25m içinde çift yönlü tekil aday: güçlü bağlama adayı. Telefon/site gibi ilave alanlar ancak bağımsız kaynaktan ve gereği varsa işlenir; tek başına ortak marka sitesi şubeleri birleştirmez.
- 25–120m, isim varyantı, aynı zincirin komşu şubesi, birden fazla hedef veya kaynak: belirsiz inceleme kuyruğu. Benzerlik puanı sıralama içindir, kimlik kararı değildir.
- Yakında hedef yok: yeni mekan adayı; kapalı/uygunsuz ad veya kategori doğrudan yayınlanmaz.
- Bir kaynakta kaybolmak: kapanma sayılmaz.
- Kaynak alanları kaynak bazında saklanır. Google ad/adres/koordinatı açık veri etiketiyle kalıcılaştırılmaz. Google place ID yalnız kimlik bağlantısı olarak tutulabilir.

### B. Arama yolu

1. Kullanıcı oturumunu doğrula.
2. Tek onaylı izdüşümden 2km içindeki bağımsız kayıtları ve yalnız bunların aktif katılım sayılarını oku.
3. Kullanıcının 2km çemberinin tamamı incelemesi tamamlanmış bağımsız bölge içinde mi kontrol et. Sadece içinde bulunduğu hücreye veya sonuç adedine bakma; sınır komşularını da kapsa.
4. Tamamı bağımsızsa **Google çağrısı ve ücretli kota rezervasyonu sıfır**.
5. Geçiş bölgesindeyse bağımsız kayıtları mevcut taze Google önbelleğiyle kimlik bazında birleştir; yeni açık veri hazırlığını bölge bazında tekilleştirilmiş iş olarak kuyruğa al. Kişinin tam konumunu veya hesabını veri indirme kaynağına taşıma; sabit bölge kutuları kullan.
6. Google keşfi yalnız geçiş politikasının izin verdiği, tamamlanmamış bölgelerde mevcut bütçe/lease korumalarıyla kalır. Kullanıcıya mekan sayısı az diye her yenilemede tekrar Google çağrısı yapılmaz.
7. Onaylı bağımsız bölgede hata olursa kayıtları Google ile sessizce değiştirme; denetlenebilir bölge politikasıyla kontrollü geri dönüş yap.

### C. İş önceliği

Önce pilotta bilinen eksik mekanlar ve kullanıcıların gerçekten aradığı bölgeler; sonra komşu bölgeler. Aynı bölgede birden fazla arama tek açık veri işi üretir. Öncelik sırası: bildirilen eksik > bağımsız sonuç veremeyen etkin bölge > yoğun kullanılan geçiş bölgesi > eski kaynak sürümü > kullanılmayan bölge. Başlangıçta açıklanabilir sıralama kullan; ölçülmemiş yapay kesinlik puanları üretme.

## Geçiş ölçütleri

Öneri, henüz etkin üretim kuralı değildir:

- Bilinen yerel kafe kontrol listesi ve açık kaynaklardan oluşturulmuş, mükerrerleri ayrılmış referans örneklemi kullan. Sadece Google karşılaştırmasıyla kapsam ölçme.
- Pilot için bilinen gerekli kafelerin en az %95'inin bulunması hedef; eksik önemli mekanlar ayrıca tamamlanır. Örneklem büyüklüğü, tarih ve payda raporda açık olmalı. Bu eşik Google ile eşdeğer kapsam garantisi vermez.
- İncelenen örneklemde yanlış şube birleşimi olmamalı; belirsizler ayrılmalı. Kullanıcı geçmişi ve aynı mekan kartı kimliği korunmalı.
- Adaylar, onaylılar, bağlı kaynaklar, kapanma bekleyenler ve son veri sürümü ayrı sayılmalı.
- Bağımsız bölge içi/sınır/boş bölge isteklerinde dış Google çağrısını testle say. Bağımsız bölgede sıfır olmalı.
- Kaynak güncellemesi/başarısız indirme/Google süresi dolması bağımsız mekanları silmemeli.
- Önce pilot bölgeyi kapat, sonra talebe göre genişlet. Tüm Türkiye için tarih veya sıfır işletim maliyeti sözü verilmez; veri depolama ve işleme maliyeti kalır.

## Hemen yapılacak iş paketi

1. Mevcut 444 adayın kaynak kimliği ve mekansal çakışma raporunu çıkar; uygun yeni yerleri incele.
2. Kaynak eşleştirmesi ve bağımsız dizini tek sorguda birleştir; 2km uyumunu düzelt ve test et.
3. Bölgesel bağımsız arama politikasını ekle; global bayrağı kapalı tut.
4. Güncel Overture pilot farkını indir/incele, sonra ATP tamamlaması. FSQ erişimi bu işleri bekletmesin.
5. Eksik yer bildirimi ve işletme kaynaklı mekan ekleme ile son boşlukları kapat.
6. Kapsam ölçütleri sağlanınca pilotun tamamında Google'ı kapat ve çağrı sayısıyla doğrula.

## Birincil kaynaklar

- Overture verisi, kaynak örtüşmesi, kalite sınırları: https://docs.overturemaps.org/guides/places/
- Resmi bölgesel indirme aracı: https://github.com/OvertureMaps/overturemaps-py
- Güncel Overture şeması: https://docs.overturemaps.org/schema/reference/places/place/
- Foursquare OS erişimi: https://docs.foursquare.com/data-products/docs/access-fsq-os-places
- Foursquare OS lisansı: https://docs.foursquare.com/data-products/docs/fsq-places-open-source
- AllThePlaces: https://github.com/alltheplaces/alltheplaces
- Kahve Dünyası kaynağı: https://github.com/alltheplaces/alltheplaces/blob/master/locations/spiders/kahve_dunyasi.py
- Google saklama sınırları ve kimlik istisnası: https://developers.google.com/maps/documentation/places/web-service/policies

Not: Mevcut kodun 28 günlük önbellek süresi bulunması, Google içeriğinin her alanını 28 gün saklamaya genel izin olduğu anlamına gelmez. Alan ve kullanılan ürün koşulları ayrı doğrulanmalıdır; bu rapor böyle bir lisans uygunluğu iddiasında bulunmaz. Bağımsızlık için Google içeriğini kalıcı dizine taşımak çözüm olarak seçilmedi.
