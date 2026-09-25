import type { es } from './es';

// Tipado contra `es`: si falta una clave o sobra una que no existe alla, el
// type-check falla. Ese es el chequeo que pide el ticket ("en los dos archivos
// de recursos") y no depende de que alguien se acuerde de mirar.
export const en: Record<keyof typeof es, string> = {
  // --- Common --------------------------------------------------------------
  'common.ok': 'OK',
  'common.cancel': 'Cancel',
  'common.close': 'Close',
  'common.back': 'Back',
  'common.error': 'Error',
  'common.success': 'Done',
  'common.loading': 'Loading...',
  'common.points': 'points',
  'common.pts': 'pts',
  'common.clearSearch': 'Clear search',
  'common.noResults': 'No results',

  // --- Errors --------------------------------------------------------------
  'error.unexpected': 'Something went wrong. Please try again.',
  'error.network':
    "We couldn't connect. Check your internet connection and try again.",

  'error.auth.invalidCredentials':
    'That email or password is not correct. Check them and try again.',
  'error.auth.emailNotConfirmed':
    "You haven't confirmed your email yet. Open the message we sent you and tap the link to activate your account.",
  'error.auth.emailExists': 'An account with that email already exists.',
  'error.auth.weakPassword':
    'That password is too weak. Use at least 6 characters mixing letters and numbers.',
  'error.auth.samePassword':
    'Your new password has to be different from the current one.',
  'error.auth.emailInvalid': "That email isn't valid. Check how you typed it.",
  'error.auth.validationFailed':
    'Some details are missing or invalid. Check the form and try again.',
  'error.auth.signupDisabled':
    'Sign-up is unavailable right now. Please try again later.',
  'error.auth.userBanned':
    'This account is suspended. Contact us to restore access.',
  'error.auth.userNotFound': "We couldn't find an account with that email.",
  'error.auth.linkExpired':
    'That link expired or was already used. Request a new one and try again.',
  'error.auth.sessionExpired':
    'Your session expired. Please sign in again to continue.',
  'error.auth.captchaFailed':
    "We couldn't verify that you're human. Please try again.",
  'error.auth.reauthNeeded':
    'For security, sign in again before making this change.',
  'error.auth.rateLimit':
    'Too many attempts in a row. Wait a moment before trying again.',
  'error.auth.rateLimitSeconds':
    'For security reasons, wait {seconds} seconds before trying again.',
  'error.auth.notBeneficiary':
    'This account is not registered as an end user. Please use the app that matches your account.',
  'error.auth.noPermission': 'This account does not have end-user permissions.',
  'error.auth.documentExists': 'An account with that ID number already exists.',
  'error.auth.emailOrDocumentExists':
    'An account with that email or ID number already exists.',
  'error.auth.signUpFailed':
    "We couldn't create your account. Please try again in a few minutes.",

  'error.db.duplicate': 'That value is already registered. Check it and try again.',
  'error.db.inUse':
    "We can't complete this because the record is still in use.",
  'error.db.missingField': 'Some required fields are missing. Check the form.',
  'error.db.invalidValue': "Some of the data isn't valid. Check it and try again.",
  'error.db.forbidden': "You don't have permission to do this.",
  'error.db.notFound': "We couldn't find what you were looking for.",

  'error.rpc.insufficientPoints': "You don't have enough points for this reward.",
  'error.rpc.outOfStock': 'This reward is out of stock.',
  'error.rpc.membershipInactive':
    'Your membership with this organization is not active.',
  'error.rpc.alreadyDelivered': 'This redemption was already delivered.',

  'error.noSession': 'There is no active session. Please sign in again.',
  'error.join.alreadyMember': 'You already belong to this organization.',
  'error.join.notAvailable':
    "You can't join this organization right now.",
  'error.join.reactivateFailed':
    "We couldn't reactivate your membership. Please try again.",
  'error.join.failed':
    "We couldn't add you to the organization. Please try again.",

  // --- Notifications -------------------------------------------------------
  'notifications.channelName': 'Points and rewards',

  // --- Not found -----------------------------------------------------------
  'notFound.title': 'Not found',
  'notFound.message': "We couldn't open this screen.",
  'notFound.action': 'Go to home',

  // --- Tab bar -------------------------------------------------------------
  'tabs.home': 'Home',
  'tabs.explore': 'Explore',
  'tabs.history': 'History',
  'tabs.more': 'More',
  'tabs.scan': 'Scan',

  // --- Sign in -------------------------------------------------------------
  'signIn.title': 'Welcome back!',
  'signIn.subtitle': 'Sign in to keep earning rewards',
  'signIn.email': 'Email',
  'signIn.emailPlaceholder': 'you@email.com',
  'signIn.password': 'Password',
  'signIn.passwordPlaceholder': 'Your password',
  'signIn.showPassword': 'Show password',
  'signIn.hidePassword': 'Hide password',
  'signIn.forgot': 'Forgot your password?',
  'signIn.submit': 'Sign In',
  'signIn.divider': 'or continue with',
  'signIn.biometric': 'Use fingerprint',
  'signIn.biometricPill': 'Fast and secure',
  'signIn.noAccountTitle': "Don't have an account?",
  'signIn.noAccountText':
    'Join Puntos Club and start enjoying all the rewards.',
  'signIn.signUpLink': 'Sign up',
  'signIn.missingFields': 'Please fill in every field.',
  'signIn.feature.secureTitle': 'Secure',
  'signIn.feature.secureText': 'Your data is protected',
  'signIn.feature.easyTitle': 'Easy',
  'signIn.feature.easyText': 'Earn and redeem your points',
  'signIn.feature.benefitsTitle': 'Rewards',
  'signIn.feature.benefitsText': 'Exclusive discounts and prizes',

  'biometric.title': 'Fingerprint',
  'biometric.offer': 'Do you want to use your fingerprint to sign in next time?',
  'biometric.later': 'Not now',
  'biometric.enable': 'Turn on',
  'biometric.notReady':
    'Sign in once with your email and password to enable fingerprint sign-in.',
  'biometric.prompt': 'Sign in with your fingerprint',

  'forgot.title': 'Reset password',
  'forgot.needEmail': 'Type your email above and tap the link again.',
  'forgot.sent': 'We sent you an email with a link to create a new password.',

  // --- Sign up -------------------------------------------------------------
  'signUp.header': 'Create Account',
  'signUp.subtitle': 'Join PuntosClub and start enjoying\nall the rewards',
  'signUp.firstName': 'First name *',
  'signUp.firstNamePlaceholder': 'John',
  'signUp.lastName': 'Last name *',
  'signUp.lastNamePlaceholder': 'Smith',
  'signUp.email': 'Email *',
  'signUp.phone': 'Phone',
  'signUp.phonePlaceholder': '+54 11 1234-5678',
  'signUp.document': 'ID number',
  'signUp.documentPlaceholder': '12345678',
  'signUp.password': 'Password *',
  'signUp.passwordPlaceholder': 'At least 6 characters',
  'signUp.confirmPassword': 'Confirm password *',
  'signUp.confirmPasswordPlaceholder': 'Repeat your password',
  'signUp.showConfirmPassword': 'Show password confirmation',
  'signUp.hideConfirmPassword': 'Hide password confirmation',
  'signUp.address': 'Address *',
  'signUp.noticeTitle': 'Your information is safe',
  'signUp.noticeText':
    'We protect your personal data and never share it with third parties.',
  'signUp.legalTitle': 'Before you continue',
  'signUp.legalText':
    'To create your PuntosClub account you need to accept our Terms and Conditions and read our Privacy Policy.',
  'signUp.acceptTerms': 'I accept the PuntosClub Terms and Conditions',
  'signUp.viewTerms': 'View Terms',
  'signUp.readPrivacy': 'I have read the Privacy Policy',
  'signUp.viewPrivacy': 'View Privacy Policy',
  'signUp.optional': 'Optional',
  'signUp.marketing': 'I want to receive PuntosClub promotions and news',
  'signUp.submit': 'Create Account',
  'signUp.haveAccount': 'Already have an account? ',
  'signUp.signInLink': 'Sign in',
  'signUp.missingFields': 'Please fill in every required field.',
  'signUp.passwordMismatch': "The passwords don't match.",
  'signUp.passwordTooShort': 'Your password must be at least 6 characters long.',
  'signUp.missingAddressTitle': 'Your address is missing',
  'signUp.missingAddressBody': 'Fill in {fields} to create your account.',
  'signUp.missingConsentTitle': 'Your consent is missing',
  'signUp.missingConsentBody':
    'To create your account you need to accept the Terms and Conditions and confirm you have read the Privacy Policy.',
  'signUp.createdTitle': 'Check your email',
  'signUp.createdBody':
    'We sent you an email to confirm your account. Tap the link in it and then sign in.',

  // --- Legal documents -----------------------------------------------------
  'legal.terms': 'Terms and Conditions',
  'legal.privacy': 'Privacy Policy',
  'legal.spanishOnly':
    'This document is available in Spanish only. Ask us for a certified translation if you need one.',

  // --- Address -------------------------------------------------------------
  'address.street': 'Street',
  'address.streetPlaceholder': 'Street name',
  'address.number': 'Number',
  'address.numberPlaceholder': 'Number',
  'address.city': 'City',
  'address.cityPlaceholder': 'City',
  'address.state': 'State/Province',
  'address.statePlaceholder': 'State or Province',
  'address.zip': 'ZIP code',
  'address.zipPlaceholder': 'ZIP code',
  'address.searchPlaceholder': 'Search address...',
  'address.searchWithGoogle': 'Search with Google Maps',
  'address.enterManually': 'Enter it manually',
  'address.hintTitle': 'Enter your address easily',
  'address.hintBody': 'You can search for your address or type it in manually.',
  'address.field.street': 'street',
  'address.field.number': 'number',
  'address.field.city': 'city',
  'address.field.state': 'state',
  'address.field.zip': 'ZIP code',

  // --- Home ----------------------------------------------------------------
  'home.greeting': 'Hi, {name}! 👋',
  'home.defaultUser': 'there',
  'home.greetingSub': 'Scan the QR code to\nunlock more rewards',
  'home.pointsLabel': 'My available points',
  'home.expandQr': 'Enlarge my QR code',
  'home.scanQr': 'Scan QR',
  'home.myOrganizations': 'My organizations',
  'home.memberSince': 'Member since {date}',
  'home.organization': 'Organization',
  'home.emptyTitle': "You don't belong to any organization yet.",
  'home.emptyBody': 'Explore organizations to start earning points.',
  'home.exploreTitle': 'Explore organizations',
  'home.exploreBody': 'Discover new stores and start earning points',
  'home.exploreAction': 'Explore',
  'home.quickActions': 'Quick actions',
  'home.quick.earn': 'How do I\nearn?',
  'home.quick.redeem': 'How do I\nredeem?',
  'home.quick.promos': 'Promotions',
  'home.quick.help': 'Help',
  'home.quick.news': 'News',
  'home.account': 'Your account',
  'home.editProfile': 'Edit profile',
  'home.name': 'Name',
  'home.email': 'Email',
  'home.phone': 'Phone',
  'home.document': 'ID number',
  'home.qrModalTitle': 'Your QR code',
  'home.qrModalSubtitle': 'Show this code to the cashier to earn points',

  'signOut.action': 'Sign out',
  'signOut.confirmTitle': 'Sign out',
  'signOut.confirmBody': 'Are you sure you want to sign out?',

  'deleteAccount.action': 'Delete my account',
  'deleteAccount.confirmTitle': 'Delete my account',
  'deleteAccount.confirmBody':
    'You will lose your points in every program, your membership in each club and your history. This cannot be undone.\n\nWe will open the page where you can request deletion.',
  'deleteAccount.continue': 'Continue',

  // --- Explore -------------------------------------------------------------
  'explore.title': 'Explore',
  'explore.scanQr': 'Scan QR',
  'explore.heroTitle': 'Discover new\norganizations!',
  'explore.heroSubtitle': 'Join by scanning a QR code\nor searching the list.',
  'explore.searchPlaceholder': 'Search organizations...',
  'explore.qrCardTitle': 'Scan QR',
  'explore.qrCardSubtitle':
    "Scan an organization's QR code\nto join in seconds",
  'explore.qrCardLabel': "Scan an organization's QR code",
  'explore.available': 'Available organizations',
  'explore.countOne': '1 organization found',
  'explore.countMany': '{count} organizations found',
  'explore.member': 'Member',
  'explore.join': 'Join',
  'explore.emptySearch': 'No organizations match that name.',
  'explore.empty': 'There are no organizations available.',
  'explore.helpTitle': "Can't find your organization?",
  'explore.helpBody': 'Ask the company or institution\nfor its QR code to join.',

  'join.confirmTitle': 'Join {name}',
  'join.confirmBody': 'Do you want to join {name} and start earning points?',
  'join.action': 'Join',
  'join.successTitle': 'All set!',
  'join.successBody': 'You joined {name}. You can start earning points now.',
  'join.viewOrganization': 'View organization',

  // --- QR scanning ---------------------------------------------------------
  'scan.permissionTitle': 'Camera permission',
  'scan.permissionBody':
    'We need camera access to scan organization QR codes.',
  'scan.permissionAction': 'Grant permission',
  'scan.instruction': "Scan the organization's QR code",
  'scan.instructionSub': 'Look for the QR code in the store or ask the staff',
  'scan.invalidQr': "Invalid QR code. Scan an organization's QR code.",
  'scan.unreadableQr':
    "We couldn't read that QR code. Make sure it's a valid organization QR code.",
  'scan.thisOrganization': 'this organization',

  // --- Profile -------------------------------------------------------------
  'profile.header': 'My Profile',
  'profile.title': 'My Profile',
  'profile.subtitle': 'Update your personal information',
  'profile.firstName': 'First name',
  'profile.lastName': 'Last name',
  'profile.email': 'Email',
  'profile.phone': 'Phone',
  'profile.document': 'ID number',
  'profile.address': 'Address (optional)',
  'profile.save': 'Save changes',
  'profile.saveFailed': "We couldn't update your profile. Please try again.",
  'profile.savedTitle': 'All set!',
  'profile.savedBody': 'Your profile was updated successfully.',
  'profile.emailChangedTitle': 'Email updated',
  'profile.emailChangedBody':
    'Check your new inbox to confirm the change.',
  'profile.language': 'Language',
  'profile.languageEs': 'Español',
  'profile.languageEn': 'English',

  // --- Organization detail -------------------------------------------------
  'org.loading': 'Loading...',
  'org.notFound': 'Not found',
  'org.notFoundBody': "We couldn't find your membership with this organization.",
  'org.fallbackName': 'Organization',
  'org.companyInfo': 'Company info',
  'org.noAddress': 'No address on file',
  'org.noContactData':
    "This organization hasn't added its contact details yet.",
  'org.pointsLabel': 'Your available points',
  'org.stats': 'Statistics',
  'org.history': 'History',
  'org.pointsEarned': 'Points earned',
  'org.pointsRedeemed': 'Points redeemed',
  'org.pointsAvailable': 'Points available',
  'org.membershipInfo': 'Membership details',
  'org.memberSince': 'Member since',
  'org.status': 'Status',
  'org.active': 'Active',
  'org.inactive': 'Inactive',
  'org.category': 'Category',
  'org.memberId': 'Member ID',
  'org.loadingOffers': 'Loading promotions...',
  'org.activeOffers': 'Active promotions',
  'org.rewardsTitle': 'Redeem your points',
  'org.rewardsSubtitle': 'Browse every reward available',
  'org.seeAll': 'See all',
  'org.loadingRewards': 'Loading rewards...',
  'org.rewardsError':
    "We couldn't load the rewards. Check your connection and come back.",
  'org.rewardsEmpty': 'No rewards to redeem yet. Keep earning points.',
  'org.unfollow': 'Unfollow organization',
  'org.unfollowConfirmTitle': 'Unfollow organization',
  'org.unfollowConfirmBody':
    'Are you sure you want to unfollow {name}? Your points and redemption history stay saved and you can follow it again whenever you want.',
  'org.unfollowAction': 'Unfollow',
  'org.unfollowFailed': "We couldn't unfollow the organization. Please try again.",
  'org.unfollowedTitle': 'All set!',
  'org.unfollowedBody':
    'You unfollowed {name}. You can follow it again from the Explore screen.',

  'industry.retail': 'Retail',
  'industry.gastronomy': 'Food & drink',
  'industry.services': 'Services',
  'industry.health': 'Health',
  'industry.beauty': 'Beauty & wellness',
  'industry.other': 'Other',

  'day.0': 'Sun',
  'day.1': 'Mon',
  'day.2': 'Tue',
  'day.3': 'Wed',
  'day.4': 'Thu',
  'day.5': 'Fri',
  'day.6': 'Sat',

  // --- Redemption ----------------------------------------------------------
  'redeem.action': 'Redeem',
  'redeem.noPointsShort': 'Not enough',
  'redeem.noPoints': 'Not enough points',
  'redeem.confirmTitle': 'Confirm redemption',
  'redeem.confirmBody':
    'Redeem "{product}" for {points} points? We hold the item for you and you can pick it up at any branch whenever you want.',
  'redeem.failedTitle': "Couldn't redeem",
  'redeem.doneTitle': 'Redemption confirmed',
  'redeem.doneBody':
    "We're holding your reward. Stop by a branch to pick it up. Track its status in your History.",

  // --- Product catalog -----------------------------------------------------
  'products.header': 'Redeem your points',
  'products.searchPlaceholder': 'Search rewards by name',
  'products.allCategories': 'All',
  'products.stock': 'In stock: {count}',
  'products.missingPoints': "You're {points} pts short",
  'products.loading': 'Loading rewards...',
  'products.errorTitle': "We couldn't load the rewards",
  'products.errorBody':
    'Check your connection and come back. If it keeps happening, update the app.',
  'products.noResultsBody': 'Try another name or clear the category filter.',
  'products.emptyTitle': 'No rewards available',
  'products.emptyBody': "There'll be rewards to redeem with your points soon.",

  // --- Activity history ----------------------------------------------------
  'history.header': 'Activity history',
  'history.filterAll': 'All',
  'history.filterEarned': 'Earned',
  'history.filterRedeemed': 'Redeemed',
  'history.filtersLabel': 'Search and filters',
  'history.searchPlaceholder': 'Search by reward, type or date',
  'history.periodAll': 'All',
  'history.period7': '7 days',
  'history.period30': '30 days',
  'history.period365': 'Last year',
  'history.countOne': '1 entry',
  'history.countMany': '{count} entries',
  'history.sortNewest': 'Newest first',
  'history.sortOldest': 'Oldest first',
  'history.sortNewestLabel': 'Show newest first',
  'history.sortOldestLabel': 'Show oldest first',
  'history.summary': 'Summary',
  'history.recent': 'Recent activity',
  'history.loadMore': 'Load more',
  'history.emptyTitle': 'No activity yet',
  'history.emptyBody': 'Your purchases and redemptions at {name} will show up here.',
  'history.noResultsBody': 'Try different words or widen the period.',
  'history.purchase': 'Purchase',
  'history.purchaseCancelled': 'Purchase cancelled',
  'history.purchaseAt': 'Purchase at {name}',
  'history.redemption': 'Redemption',
  'history.redemptionCancelled': 'Redemption cancelled',
  'history.deletedProduct': 'Deleted reward',
  'history.theOrganization': 'the organization',

  // --- General history (all organizations) ---------------------------------
  'historyAll.header': 'General history',
  'historyAll.subtitle': 'All your activity on PuntosClub',
  'historyAll.assignedPoints': 'Points earned',
  'historyAll.cancelledPoints': 'Points cancelled',
  'historyAll.redemptionsDone': 'Redemptions',
  'historyAll.filterAll': 'All',
  'historyAll.filterAssigned': 'Earned',
  'historyAll.filterCancelled': 'Cancelled',
  'historyAll.filterRedeemed': 'Redemptions',
  'historyAll.periodLabel': 'Period',
  'historyAll.period0': 'All history',
  'historyAll.period7': 'Last 7 days',
  'historyAll.period30': 'Last 30 days',
  'historyAll.period90': 'Last 3 months',
  'historyAll.period365': 'Last year',
  'historyAll.today': 'Today, {date}',
  'historyAll.yesterday': 'Yesterday, {date}',
  'historyAll.redemption': 'Reward redemption',
  'historyAll.loadMore': 'Load more activity',
  'historyAll.emptyTitle': 'No activity yet',
  'historyAll.emptyBody':
    'Your purchases and redemptions across every organization will show up here.',
  'historyAll.noResultsTitle': 'No activity in this period',
  'historyAll.noResultsBody': 'Try another filter or widen the period.',
  // --- Notification panel --------------------------------------------------
  'notif.header': 'Notifications',
  'notif.subtitle': 'Everything happening in your clubs, in one place',
  'notif.bell': 'Notifications',
  'notif.unread': '{count} unread',
  'notif.today': 'Today',
  'notif.yesterday': 'Yesterday',
  'notif.thisWeek': 'This week',
  'notif.older': 'Earlier',
  'notif.pointsTitle': 'You earned points! 🎉',
  'notif.pointsBody': '{org} credited you {points} points for your purchase.',
  'notif.redeemTitle': 'Reward redeemed! 🎁',
  'notif.redeemBody': 'You redeemed {product} at {org}. Thanks for being part of it!',
  'notif.rewardsTitle': 'New rewards available ✨',
  'notif.rewardsBody': '{org} added {count} new rewards for you.',
  'notif.joinedTitle': 'New organization! ⭐',
  'notif.joinedBody': 'You joined {org}. Discover all its benefits.',
  'notif.emptyTitle': 'No notifications',
  'notif.emptyBody':
    'Your points, redemptions and club news will show up here.',
  'notif.clear': 'Clear notifications',
  'notif.clearTitle': 'Clear everything?',
  'notif.clearBody':
    'This empties the panel on this phone. Your points and redemptions are untouched: they stay in your history.',
  'notif.clearConfirm': 'Clear',
};
