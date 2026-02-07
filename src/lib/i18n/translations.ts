// Centralized translations for the app
// Cafe names & OSM data remain untouched (original language)

export type Locale = 'en' | 'tr';

export const translations = {
  en: {
    // Navigation
    nav: {
      discover: 'Discover',
      messages: 'Messages',
      notifications: 'Notifications',
      profile: 'Profile',
    },

    // Discover page
    discover: {
      title: 'Discover',
      yourLocation: 'Your location',
      nearbyCafes: 'Nearby cafes',
      gettingLocation: 'Getting location...',
      getLocation: 'Get Location',
      openOnly: 'Show open only',
      closedCount: '+{count} closed',
      activeCafes: 'Active Cafes Nearby',
      allCafes: 'All Cafes',
      noLocationCafes: 'Nearby cafes will appear when location is available.',
      beFirst: 'No active cafes nearby. Be the first to check in!',
      noOpenCafes: 'No open cafes found',
      noCafesNearby: 'No cafes found nearby',
      noOpenCafesDesc: 'No cafes are open right now. Remove the filter to see closed ones.',
      noCafesDesc: 'No registered cafes within 3 km.',
      showAll: 'Show all ({count} closed)',
      retry: 'Try Again',
    },

    // Cafe status
    cafeStatus: {
      open: 'Open',
      closingSoon: 'Closing soon',
      closed: 'Closed',
      hoursUnknown: 'Hours unknown',
      openNow: 'Open now',
    },

    // Cafe room
    cafeRoom: {
      peopleHere: '{count} people here',
      peopleHereNow: 'People here now',
      filterCount: '({filtered} of {total})',
      noFilterMatch: 'No one matches this filter',
      tryAll: 'Try selecting "All" to see everyone',
      noOneHere: 'No one else here yet',
      beFirst: 'Be the first to check in!',
      autoCheckout: 'Auto check-out',
      autoCheckoutDesc: "You'll be automatically checked out after 60 minutes for your safety.",
    },

    // Check-in
    checkIn: {
      checkIn: 'Check In',
      checkOut: 'Check Out',
      verifyingLocation: 'Verifying location...',
      checkedIn: "You're now visible at {cafe}",
      expiresIn: 'Your presence will expire in 60 minutes',
      leftCafe: "You've left {cafe}",
    },

    // Messages
    messages: {
      title: 'Messages',
      noMatches: 'No matches yet',
      noMatchesDesc: 'Wave at people in cafes and when they wave back, you can chat!',
      matchedAt: 'Matched at {cafe}',
      emptyInbox: 'Your inbox is empty',
      emptyInboxDesc: 'Check into a cafe, wave at people, and start conversations!',
      findCafes: 'Find Cafes Nearby',
    },

    // Chat
    chat: {
      title: 'Chat',
      typeMessage: 'Type a message...',
      typing: 'typing...',
      chatUnavailable: 'Chat Unavailable',
      chatUnavailableDesc: 'Your match with this user is no longer active. A mutual match is required to message.',
      backToMessages: 'Back to Messages',
      reportUser: 'Report User',
      blockUser: 'Block User',
      startConversation: 'Start a conversation with {name}',
      startConversationDesc: 'Say hello and break the ice! ☕',
    },

    // Profile
    profile: {
      title: 'Profile',
      editProfile: 'Edit Profile',
      signOut: 'Sign Out',
    },

    // Interactions
    interactions: {
      wave: 'Wave',
      waved: 'Waved',
      matched: 'Matched',
      waveBack: 'Wave back',
      waveFirst: 'Wave at each other first to unlock chat',
      youWaved: '👋 You waved at {name}!',
      theyNotified: "They'll be notified",
      mutualWave: 'You and {name} waved at each other! 🎉',
      chatUnlocked: 'Chat is now unlocked',
      matchCreated: 'You matched with {name}! 🎉',
      comingSoon: 'Coming soon!',
    },

    // Intent filters
    intents: {
      all: 'All',
      chat: 'Chat',
      friendship: 'Friendship',
      dating: 'Dating',
    },

    // Common
    common: {
      loading: 'Loading...',
      error: 'Error',
      retry: 'Retry',
      cancel: 'Cancel',
      confirm: 'Confirm',
      save: 'Save',
      delete: 'Delete',
      back: 'Back',
      here: 'here',
    },

    // Time
    time: {
      justNow: 'Just now',
      minutesAgo: '{count}m ago',
      hoursAgo: '{count}h ago',
      openUntil: 'Open until {time}',
      opensAt: 'Opens {day} {time}',
      open24h: 'Open 24 hours',
      online: 'Online',
      lastActive: 'Active {time} ago',
      lastActiveNow: 'Active now',
    },

    // Errors
    errors: {
      locationDenied: 'Location permission denied',
      locationUnavailable: 'Location unavailable',
      locationTimeout: 'Location request timed out',
      unknownError: 'An unknown error occurred',
    },
  },

  tr: {
    // Navigation
    nav: {
      discover: 'Keşfet',
      messages: 'Mesajlar',
      notifications: 'Bildirimler',
      profile: 'Profil',
    },

    // Discover page
    discover: {
      title: 'Keşfet',
      yourLocation: 'Konumun',
      nearbyCafes: 'Yakındaki kafeler',
      gettingLocation: 'Konum alınıyor...',
      getLocation: 'Konum Al',
      openOnly: 'Sadece açık olanlar',
      closedCount: '+{count} kapalı',
      activeCafes: 'Yakındaki Aktif Kafeler',
      allCafes: 'Tüm Kafeler',
      noLocationCafes: 'Konum bilgisi alındığında yakındaki kafeler görünecek.',
      beFirst: 'Yakında aktif kafe yok. İlk check-in yapan sen ol!',
      noOpenCafes: 'Açık kafe bulunamadı',
      noCafesNearby: 'Yakında kafe bulunamadı',
      noOpenCafesDesc: 'Şu an açık kafe yok. Kapalı kafeleri de görmek için filtreyi kaldırın.',
      noCafesDesc: '3 km çevresinde kayıtlı kafe yok.',
      showAll: 'Tümünü göster ({count} kapalı)',
      retry: 'Tekrar Dene',
    },

    // Cafe status
    cafeStatus: {
      open: 'Açık',
      closingSoon: 'Kapanmak üzere',
      closed: 'Kapalı',
      hoursUnknown: 'Saatler bilinmiyor',
      openNow: 'Şu an açık',
    },

    // Cafe room
    cafeRoom: {
      peopleHere: '{count} kişi burada',
      peopleHereNow: 'Şu an burada olanlar',
      filterCount: '({filtered} / {total})',
      noFilterMatch: 'Bu filtreye uyan kimse yok',
      tryAll: '"Tümü" seçerek herkesi görebilirsin',
      noOneHere: 'Henüz burada kimse yok',
      beFirst: 'İlk check-in yapan sen ol!',
      autoCheckout: 'Otomatik çıkış',
      autoCheckoutDesc: 'Güvenliğin için 60 dakika sonra otomatik olarak çıkış yapılacak.',
    },

    // Check-in
    checkIn: {
      checkIn: 'Check In',
      checkOut: 'Çıkış Yap',
      verifyingLocation: 'Konum doğrulanıyor...',
      checkedIn: '{cafe} kafesindesin',
      expiresIn: 'Görünürlüğün 60 dakika içinde sona erecek',
      leftCafe: '{cafe} kafesinden ayrıldın',
    },

    // Messages
    messages: {
      title: 'Mesajlar',
      noMatches: 'Henüz eşleşme yok',
      noMatchesDesc: 'Kafelerdeki insanlara el salla, onlar da karşılık verince sohbet edebilirsin!',
      matchedAt: '{cafe} kafesinde eşleştiniz',
      emptyInbox: 'Gelen kutun boş',
      emptyInboxDesc: 'Bir kafeye check-in yap, insanlara el salla ve sohbete başla!',
      findCafes: 'Yakındaki Kafeleri Bul',
    },

    // Chat
    chat: {
      title: 'Sohbet',
      typeMessage: 'Mesaj yaz...',
      typing: 'yazıyor...',
      chatUnavailable: 'Sohbet Kullanılamıyor',
      chatUnavailableDesc: 'Bu kullanıcıyla eşleşmeniz artık aktif değil. Mesajlaşma için karşılıklı eşleşme gereklidir.',
      backToMessages: 'Mesajlara Dön',
      reportUser: 'Kullanıcıyı Şikayet Et',
      blockUser: 'Kullanıcıyı Engelle',
      startConversation: '{name} ile sohbete başla',
      startConversationDesc: 'Merhaba de ve buzları kır! ☕',
    },

    // Profile
    profile: {
      title: 'Profil',
      editProfile: 'Profili Düzenle',
      signOut: 'Çıkış Yap',
    },

    // Interactions
    interactions: {
      wave: 'El Salla',
      waved: 'Salladın',
      matched: 'Eşleştiniz',
      waveBack: 'Karşılık ver',
      waveFirst: 'Sohbet için önce karşılıklı el sallayın',
      youWaved: '👋 {name} kişisine el salladın!',
      theyNotified: 'Bildirim gönderildi',
      mutualWave: '{name} ile karşılıklı el salladınız! 🎉',
      chatUnlocked: 'Sohbet açıldı',
      matchCreated: '{name} ile eşleştiniz! 🎉',
      comingSoon: 'Yakında!',
    },

    // Intent filters
    intents: {
      all: 'Tümü',
      chat: 'Sohbet',
      friendship: 'Arkadaşlık',
      dating: 'Flört',
    },

    // Common
    common: {
      loading: 'Yükleniyor...',
      error: 'Hata',
      retry: 'Tekrar Dene',
      cancel: 'İptal',
      confirm: 'Onayla',
      save: 'Kaydet',
      delete: 'Sil',
      back: 'Geri',
      here: 'burada',
    },

    // Time
    time: {
      justNow: 'Az önce',
      minutesAgo: '{count} dk önce',
      hoursAgo: '{count} sa önce',
      openUntil: '{time} kadar açık',
      opensAt: '{day} {time} açılıyor',
      open24h: '24 saat açık',
      online: 'Çevrimiçi',
      lastActive: '{time} önce aktif',
      lastActiveNow: 'Şu an aktif',
    },

    // Errors
    errors: {
      locationDenied: 'Konum izni reddedildi',
      locationUnavailable: 'Konum bilgisi alınamadı',
      locationTimeout: 'Konum isteği zaman aşımına uğradı',
      unknownError: 'Bilinmeyen bir hata oluştu',
    },
  },
} as const;

export type TranslationKeys = typeof translations.en;
