# Riyo veri akışları ve saklama kararları

Bu kayıt, uygulama kodu ve mevcut operasyon kayıtlarından doğrulanabilen akışları özetler. Hukuki dayanak ve sağlayıcı sözleşmesi kararları veri sorumlusunun incelemesine açıktır.

| İşlem | Veri ve kullanım | Alıcı veya saklama yeri | Açık karar |
| --- | --- | --- | --- |
| Hesap ve oturum | E-posta, temel profil bilgileri ve yaş kontrolünde kullanılan doğum tarihi | Supabase, Google ile giriş seçildiğinde Google | Her amaç için işleme şartı ve sağlayıcı aktarım dayanağı |
| Yakın mekân ve check-in | Cihaz konumu ile mekân araması ve yakınlık kontrolü. Gerektiğinde Google Places'a yaklaşık arama alanı gönderilir. | Supabase ve Google Places. Aktif mekân katılımcılarına izinli profil alanları görünür. | Konum ve check-in kayıtları için saklama süresi |
| Profil fotoğrafı | Yükleyenin ayrı izniyle fotoğraf içerik denetimine gider. Kabul ve ret sonucu fotoğraf nesnesiyle ilişkilendirilir. | Supabase Storage ve OpenAI | Sağlayıcının hesap özelindeki saklama koşulları, aktarım dayanağı ve denetim kaydı süresi |
| Hesap doğrulama | Yetkili ekip selfie ile başvuru anındaki profil fotoğrafını elle karşılaştırır. Bekleyen başvuruda inceleme erişimi 7 gündür. | Supabase Storage ve yetkili Riyo ekibi | Süresi dolan, reddedilen ve geri çekilen başvurular için aktif dosya ve karar kaydı süreleri |
| Mesaj ve şikâyet | Mesajları sohbet katılımcıları görür. Güvenlik bildirimleri ve moderasyon kararları yetkili ekipçe işlenebilir. | Supabase ve yetkili Riyo ekibi | Açık ve kapanmış şikâyetler, itirazlar ve moderasyon kayıtları için ayrı süreler |
| Kurtarma kopyaları | Veritabanı için 7 günlük ve 4 haftalık kopya. Fotoğraf ve selfie dosyaları için ayrı 7 günlük döngü. | Hostinger, Litvanya | İkinci hedef seçildiğinde aktarım ve erişim kapsamı. Geri yüklemede daha önce silinmiş verileri tekrar kaldırma prosedürü. |

Selfie, başvuru sonuçlandığında veya geri çekildiğinde kullanıcı tarafından silinebilir. Yeni başvuru öncesinde eski dosyalar temizlenir. İnceleme erişimi dolduğunda dosyayı otomatik silen bir görev doğrulanmadı. Otomatik temizlik için önce karar, başvuru ve dosya süreleri ayrı ayrı belirlenmeli.

KVKK kaynakları: [aydınlatma](https://www.kvkk.gov.tr/Icerik/2033/Aydinlatma-Yukumlulugu-), [yurt dışı aktarım](https://www.kvkk.gov.tr/Icerik/2053/Yurtdisina-Aktarim), [saklama ve imha](https://www.kvkk.gov.tr/Icerik/5441/KISISEL-VERILERIN-SILINMESI-YOK-EDILMESI-VEYA-ANONIM-HALE-GETIRILMESI-HAKKINDA-YONETMELIK).
