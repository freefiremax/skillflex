import type { Language } from '@skillflex/shared'
import { useAuth } from './auth'

export interface TranslationDict {
  [key: string]: string | TranslationDict
}

export const TRANSLATIONS: Record<Language, Record<string, string>> = {
  en: {
    // Nav
    'nav.home': 'Home',
    'nav.lessons': 'Lessons',
    'nav.live': 'Live',
    'nav.feedback': 'Feedback',
    'nav.plan': 'Plan',
    'nav.queue': 'Queue',
    'nav.profile': 'Profile',
    'nav.account': 'Account',
    'nav.exit': 'Exit',

    // Common
    'common.back': 'Back',
    'common.saving': 'Saving…',
    'common.saved': 'Saved.',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.close': 'Close',
    'common.loading': 'Loading…',
    'common.sign_out': 'Sign out',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.video': 'Video',
    'common.min': 'min',

    // Account Page
    'account.title': 'Your account',
    'account.subtitle': 'What we hold, why we hold it, and how to take it back.',
    'account.pref_lang': 'Preferred Language',
    'account.pref_lang_desc': 'Select the active language for lectures, lesson materials, and interface.',
    'account.consent': 'Consent',
    'account.consent_updated': 'Our policy has been updated. Re-confirm the items marked below.',
    'account.granted': 'Granted',
    'account.not_granted': 'Not granted',
    'account.reconfirm': 'Re-confirm',
    'account.withdraw': 'Withdraw',
    'account.grant': 'Grant',
    'account.your_data': 'Your data',
    'account.your_data_desc': "Download everything we hold about you — profile, submissions, your mentors' written feedback, your plans, and the full consent log — as one JSON file.",
    'account.download_data': 'Download my data',
    'account.preparing': 'Preparing…',
    'account.withdraw_title': 'Withdraw consent?',
    'account.keep_as_is': 'Keep it as is',
    'account.confirm_withdraw': 'Yes, withdraw it',

    // Mentor Profile
    'mentor.title': 'Your profile',
    'mentor.subtitle': 'Languages and skills are how students find you — this is the matching input, not decoration.',
    'mentor.headline': 'Headline',
    'mentor.headline_ph': 'Interview coach, ex-TCS',
    'mentor.bio': 'About you',
    'mentor.bio_ph': "How you work with students, and who you're best for.",
    'mentor.languages': 'I can mentor in',
    'mentor.languages_hint': 'Select languages you can mentor students in. Changes apply when saved below.',
    'mentor.skills': 'Skills I coach',
    'mentor.max_students': 'Max active students',
    'mentor.max_students_hint': "Once you hit this, students can't switch to you until a slot frees up. Set it to what you can genuinely review every week.",
    'mentor.accepting': "I'm accepting new students",
    'mentor.save': 'Save profile',

    // Lessons Page
    'lessons.title': 'Lessons',
    'lessons.active_lang': 'Active language',
    'lessons.lang_fallback': '(with English fallback where unavailable) — switch anytime using the language selector above.',
    'lessons.no_lessons': 'No lessons yet',
    'lessons.no_lessons_sub': 'Your college is still setting up the curriculum.',
    'lessons.available_in': 'AVAILABLE IN',
    'lessons.not_available': 'Not available in this language yet — showing closest version.',
    'lessons.your_task': 'Your task',
    'lessons.mentor_scores': 'YOUR MENTOR WILL SCORE',
    'lessons.record_answer': 'Record my answer',
    'lessons.record_again': 'Record it again',

    // Home Page
    'home.greeting': 'Namaste',
    'home.watch_lesson': 'Watch a lesson',
    'home.watch_lesson_desc': 'Pick any video and play it to the end.',
    'home.record_task': 'Record your answer',
    'home.record_task_desc': 'Open a task and speak into your phone.',
    'home.read_notes': "Read mentor's notes",
    'home.read_notes_desc': 'Check feedback after a day or two — a person writes them.',
    'home.work_plan': 'Work through your plan',
    'home.work_plan_desc': 'Take small steps from your notes.',
    'home.practice_word': 'Practise a word',
    'home.your_level': 'Your level',
    'home.leaderboard': 'Leaderboard',
    'home.languages': 'Languages',
    'home.your_mentor': 'Your mentor',
    'home.quote': 'Learn at your pace, in your language.',

    // Live Page
    'live.title': 'Live',
    'live.upcoming': 'Upcoming',
    'live.mine': 'Mine',
    'live.recordings': 'Recordings',
    'live.all_skills': 'All skills',
    'live.only_my_lang': 'Only in my language',
    'live.no_classes': 'No lectures scheduled',
    'live.no_classes_sub': 'Mentors post group sessions here. Check the Recordings tab in the meantime.',

    // Mascot
    'mascot.study_buddy': 'STUDY BUDDY',
    'mascot.online': 'Online',
    'mascot.fun_time': 'Fun Time',
    'mascot.fun_time_desc': 'Play drills & games',
    'mascot.ai_support': 'AI Support',
    'mascot.ai_support_desc': 'Get 24/7 help',
    'mascot.signed_out': "I'm your study buddy. Sign in and I'll show you around.",
    'mascot.account_line': 'Your data, your call. Export or delete it from here.',
    'mascot.profile_line': 'Students read this before they pick you.',
    'mascot.lessons_line': 'Lectures, module by module. Watch one all the way through.',
    'mascot.live_line': 'Lectures happen at a time. Join live or catch the recording.',

    // Plan Page
    'plan.title': "This week's plan",
    'plan.subtitle_1': 'Built from what your mentor actually wrote.',
    'plan.subtitle_2': 'Every line traces back to real feedback.',
    'plan.no_plan': 'No plan yet',
    'plan.no_plan_sub': 'Your plan appears once a mentor reviews your work.',
    'plan.how_made_title': 'HOW THIS WAS MADE',
    'plan.how_made_desc_1': "Restructured from 1 piece of your mentor's feedback. No AI watched or scored your videos — it only reorganised what a human already told you.",
    'plan.how_made_desc_plural': "Restructured from {count} pieces of your mentor's feedback. No AI watched or scored your videos — it only reorganised what a human already told you.",
    'plan.week_of': 'WEEK OF {date}',
    'plan.done_count': '{done}/{total} done',
    'plan.motivation_title': 'Small steps. Big progress.',
    'plan.motivation_sub': 'Keep showing up!',
  },

  hi: {
    // Nav
    'nav.home': 'होम',
    'nav.lessons': 'पाठ',
    'nav.live': 'लाइव',
    'nav.feedback': 'फीडबैक',
    'nav.plan': 'योजना',
    'nav.queue': 'रिव्यू कतार',
    'nav.profile': 'प्रोफ़ाइल',
    'nav.account': 'खाता',
    'nav.exit': 'बाहर निकलें',

    // Common
    'common.back': 'वापस',
    'common.saving': 'सहेज रहे हैं…',
    'common.saved': 'सहेजा गया.',
    'common.save': 'सहेजें',
    'common.cancel': 'रद्द करें',
    'common.close': 'बंद करें',
    'common.loading': 'लोड हो रहा है…',
    'common.sign_out': 'साइन आउट',
    'common.yes': 'हाँ',
    'common.no': 'नहीं',
    'common.video': 'वीडियो',
    'common.min': 'मिनट',

    // Account Page
    'account.title': 'आपका खाता',
    'account.subtitle': 'हम क्या जानकारी रखते हैं, क्यों रखते हैं, और इसे कैसे वापस ले सकते हैं।',
    'account.pref_lang': 'पसंदीदा भाषा',
    'account.pref_lang_desc': 'लेक्चर, पाठ सामग्री और पूरे इंटरफ़ेस के लिए सक्रिय भाषा चुनें।',
    'account.consent': 'सहमति',
    'account.consent_updated': 'हमारी नीति अपडेट हो गई है। कृपया नीचे दिए गए विकल्पों की पुनः पुष्टि करें।',
    'account.granted': 'स्वीकृत',
    'account.not_granted': 'अस्वीकृत',
    'account.reconfirm': 'पुनः पुष्टि करें',
    'account.withdraw': 'सहमति वापस लें',
    'account.grant': 'सहमति दें',
    'account.your_data': 'आपका डेटा',
    'account.your_data_desc': 'अपने बारे में सभी डेटा डाउनलोड करें — प्रोफ़ाइल, सबमिशन, मेंटर्स का लिखित फीडबैक, योजनाएं और संपूर्ण सहमति लॉग — एक JSON फ़ाइल के रूप में।',
    'account.download_data': 'मेरा डेटा डाउनलोड करें',
    'account.preparing': 'तैयार किया जा रहा है…',
    'account.withdraw_title': 'सहमति वापस लें?',
    'account.keep_as_is': 'जैसा है वैसा ही रहने दें',
    'account.confirm_withdraw': 'हाँ, सहमति वापस लें',

    // Mentor Profile
    'mentor.title': 'आपकी प्रोफ़ाइल',
    'mentor.subtitle': 'भाषा और कौशल के माध्यम से छात्र आपको ढूंढते हैं — यह मेंटर मैचिंग के लिए मुख्य इनपुट है।',
    'mentor.headline': 'शीर्षक / हेडलाइन',
    'mentor.headline_ph': 'साक्षात्कार कोच, पूर्व-TCS',
    'mentor.bio': 'आपके बारे में',
    'mentor.bio_ph': 'आप छात्रों के साथ कैसे काम करते हैं और आप किनके लिए सर्वश्रेष्ठ हैं।',
    'mentor.languages': 'मैं इन भाषाओं में मेंटर कर सकता हूँ',
    'mentor.languages_hint': 'वे भाषाएं चुनें जिनमें आप छात्रों का मार्गदर्शन कर सकते हैं। नीचे सहेजने पर परिवर्तन लागू होंगे।',
    'mentor.skills': 'कौशल जिनका मैं मार्गदर्शन करता हूँ',
    'mentor.max_students': 'अधिकतम सक्रिय छात्र',
    'mentor.max_students_hint': 'इस सीमा तक पहुंचने के बाद, स्लॉट खाली होने तक नए छात्र नहीं जुड़ सकते। इसे अपनी समीक्षा क्षमता के अनुसार सेट करें।',
    'mentor.accepting': 'मैं नए छात्रों को स्वीकार कर रहा हूँ',
    'mentor.save': 'प्रोफ़ाइल सहेजें',

    // Lessons Page
    'lessons.title': 'पाठ व लेक्चर्स',
    'lessons.active_lang': 'सक्रिय भाषा',
    'lessons.lang_fallback': '(जहाँ उपलब्ध न हो वहाँ अंग्रेज़ी) — ऊपर दिए गए भाषा चयनकर्ता से कभी भी बदलें।',
    'lessons.no_lessons': 'अभी कोई पाठ उपलब्ध नहीं है',
    'lessons.no_lessons_sub': 'आपका कॉलेज अभी पाठ्यक्रम तैयार कर रहा है।',
    'lessons.available_in': 'उपलब्ध भाषाएं',
    'lessons.not_available': 'इस भाषा में अभी उपलब्ध नहीं है — निकटतम संस्करण दिखाया जा रहा है।',
    'lessons.your_task': 'आपका कार्य / असाइनमेंट',
    'lessons.mentor_scores': 'आपका मेंटर इस पर अंक देगा',
    'lessons.record_answer': 'मेरा उत्तर रिकॉर्ड करें',
    'lessons.record_again': 'पुनः रिकॉर्ड करें',

    // Home Page
    'home.greeting': 'नमस्ते',
    'home.watch_lesson': 'एक पाठ देखें',
    'home.watch_lesson_desc': 'कोई भी वीडियो चुनें और अंत तक देखें।',
    'home.record_task': 'अपना उत्तर रिकॉर्ड करें',
    'home.record_task_desc': 'कार्य खोलें और अपने फोन में बोलें।',
    'home.read_notes': 'मेंटर के नोट्स पढ़ें',
    'home.read_notes_desc': 'एक या दो दिन बाद फीडबैक जांचें — एक वास्तविक शिक्षक इन्हें लिखते हैं।',
    'home.work_plan': 'अपनी योजना पर काम करें',
    'home.work_plan_desc': 'अपने नोट्स के आधार पर छोटे कदम उठाएं।',
    'home.practice_word': 'शब्द का अभ्यास करें',
    'home.your_level': 'आपका स्तर',
    'home.leaderboard': 'लीडरबोर्ड',
    'home.languages': 'भाषाएं',
    'home.your_mentor': 'आपके मेंटर',
    'home.quote': 'अपनी गति से सीखें, अपनी भाषा में।',

    // Live Page
    'live.title': 'लाइव लेक्चर्स',
    'live.upcoming': 'आगामी',
    'live.mine': 'मेरी कक्षाएं',
    'live.recordings': 'रिकॉर्डिंग',
    'live.all_skills': 'सभी कौशल',
    'live.only_my_lang': 'केवल मेरी भाषा में',
    'live.no_classes': 'कोई लेक्चर निर्धारित नहीं है',
    'live.no_classes_sub': 'मेंटर यहाँ समूह सत्र पोस्ट करते हैं। इस बीच रिकॉर्डिंग टैब देखें।',

    // Mascot
    'mascot.study_buddy': 'स्टडी बडी',
    'mascot.online': 'ऑनलाइन',
    'mascot.fun_time': 'फन टाइम',
    'mascot.fun_time_desc': 'खेल और अभ्यास करें',
    'mascot.ai_support': 'एआई सहायता',
    'mascot.ai_support_desc': '24/7 तुरंत मदद पाएं',
    'mascot.signed_out': 'मैं आपका स्टडी बडी हूँ। साइन इन करें और मैं आपको सब कुछ दिखाऊंगा।',
    'mascot.account_line': 'आपका डेटा, आपका निर्णय। यहाँ से डाउनलोड या हटाएं।',
    'mascot.profile_line': 'छात्र आपको चुनने से पहले यह प्रोफ़ाइल पढ़ते हैं।',
    'mascot.lessons_line': 'व्याख्यान, मॉड्यूल दर मॉड्यूल। पूरा ध्यान से देखें।',
    'mascot.live_line': 'लाइव सत्र समय पर होते हैं। सीधे जुड़ें या रिकॉर्डिंग देखें।',

    // Plan Page
    'plan.title': 'इस सप्ताह की योजना',
    'plan.subtitle_1': 'आपके मेंटर के वास्तविक फीडबैक से निर्मित।',
    'plan.subtitle_2': 'हर पंक्ति वास्तविक फीडबैक से जुड़ी है।',
    'plan.no_plan': 'अभी कोई योजना नहीं है',
    'plan.no_plan_sub': 'जब मेंटर आपके कार्य की समीक्षा करेंगे, तो आपकी योजना यहाँ दिखेगी।',
    'plan.how_made_title': 'यह कैसे बनाया गया',
    'plan.how_made_desc_1': 'आपके मेंटर के 1 फीडबैक के आधार पर संकलित। किसी एआई ने आपके वीडियो का मूल्यांकन नहीं किया — इसने केवल वही व्यवस्थित किया है जो आपके मेंटर ने कहा था।',
    'plan.how_made_desc_plural': 'आपके मेंटर के {count} फीडबैक के आधार पर संकलित। किसी एआई ने आपके वीडियो का मूल्यांकन नहीं किया — इसने केवल वही व्यवस्थित किया है जो आपके मेंटर ने कहा था।',
    'plan.week_of': 'सप्ताह: {date}',
    'plan.done_count': '{done}/{total} पूर्ण',
    'plan.motivation_title': 'छोटे कदम। बड़ी प्रगति।',
    'plan.motivation_sub': 'प्रयास जारी रखें!',
  },

  mr: {
    // Nav
    'nav.home': 'मुख्यपृष्ठ',
    'nav.lessons': 'धडे',
    'nav.live': 'थेट वर्ग',
    'nav.feedback': 'अभिप्राय',
    'nav.plan': 'योजना',
    'nav.queue': 'तपासणी रांग',
    'nav.profile': 'प्रोफाइल',
    'nav.account': 'खाते',
    'nav.exit': 'बाहेर पडा',

    // Common
    'common.back': 'मागे',
    'common.saving': 'जतन करत आहे…',
    'common.saved': 'जतन केले.',
    'common.save': 'जतन करा',
    'common.cancel': 'रद्द करा',
    'common.close': 'बंद करा',
    'common.loading': 'लोड होत आहे…',
    'common.sign_out': 'साइन आउट',
    'common.yes': 'होय',
    'common.no': 'नाही',
    'common.video': 'व्हिडिओ',
    'common.min': 'मिनिटे',

    // Account Page
    'account.title': 'तुमचे खाते',
    'account.subtitle': 'आमच्याकडे काय माहिती आहे, का आहे आणि ती कशी परत घ्यावी.',
    'account.pref_lang': 'पसंतीची भाषा',
    'account.pref_lang_desc': 'व्याख्याने, अभ्यास साहित्य आणि संपूर्ण इंटरफेससाठी सक्रिय भाषा निवडा.',
    'account.consent': 'संमती',
    'account.consent_updated': 'आमचे धोरण अद्यतनित झाले आहे. कृपया खालील बाबींची पुन्हा खात्री करा.',
    'account.granted': 'संमत',
    'account.not_granted': 'असंमत',
    'account.reconfirm': 'पुन्हा संमती द्या',
    'account.withdraw': 'संमती मागे घ्या',
    'account.grant': 'संमती द्या',
    'account.your_data': 'तुमचा डेटा',
    'account.your_data_desc': 'आपल्याबद्दलचा सर्व डेटा डाउनलोड करा — प्रोफाइल, सबमिशन, मार्गदर्शकांचे लिखित अभिप्राय, योजना आणि संमती नोंद — एकाच JSON फाइलमध्ये.',
    'account.download_data': 'माझा डेटा डाउनलोड करा',
    'account.preparing': 'तयार होत आहे…',
    'account.withdraw_title': 'संमती मागे घ्यायची का?',
    'account.keep_as_is': 'आहे तसेच ठेवा',
    'account.confirm_withdraw': 'होय, संमती मागे घ्या',

    // Mentor Profile
    'mentor.title': 'तुमची प्रोफाइल',
    'mentor.subtitle': 'भाषा आणि कौशल्यांद्वारे विद्यार्थी तुम्हाला शोधतात — हे मार्गदर्शक जुळणीसाठी मुख्य इनपुट आहे.',
    'mentor.headline': 'शीर्षक / हेडलाइन',
    'mentor.headline_ph': 'मुलाखत प्रशिक्षक, माजी-TCS',
    'mentor.bio': 'तुमच्याबद्दल',
    'mentor.bio_ph': 'तुम्ही विद्यार्थ्यांसोबत कसे काम करता आणि तुम्ही कोणासाठी सर्वोत्तम आहात.',
    'mentor.languages': 'मी या भाषांमध्ये मार्गदर्शन करू शकतो',
    'mentor.languages_hint': 'तुम्ही विद्यार्थ्यांना मार्गदर्शन करू शकता अशा भाषा निवडा. खाली जतन केल्यावर बदल लागू होतील.',
    'mentor.skills': 'मी शिकवत असलेली कौशल्ये',
    'mentor.max_students': 'जास्तीत जास्त सक्रिय विद्यार्थी',
    'mentor.max_students_hint': 'ही मर्यादा पूर्ण झाल्यावर, जागा रिकामी होईपर्यंत नवीन विद्यार्थी निवडू शकत नाहीत. दर आठवड्याला तपासू शकाल तेवढेच ठेवा.',
    'mentor.accepting': 'मी नवीन विद्यार्थ्यांना मार्गदर्शन स्वीकारत आहे',
    'mentor.save': 'प्रोफाइल जतन करा',

    // Lessons Page
    'lessons.title': 'धडे आणि व्याख्याने',
    'lessons.active_lang': 'सक्रिय भाषा',
    'lessons.lang_fallback': '(जिथे उपलब्ध नसेल तिथे इंग्रजी) — वरील भाषा निवडकातून कधीही बदला.',
    'lessons.no_lessons': 'अद्याप कोणतेही धडे उपलब्ध नाहीत',
    'lessons.no_lessons_sub': 'तुमचे कॉलेज अजून अभ्यासक्रम तयार करत आहे.',
    'lessons.available_in': 'या भाषांमध्ये उपलब्ध',
    'lessons.not_available': 'या भाषेत अद्याप उपलब्ध नाही — सर्वात जवळची आवृत्ती दाखवत आहे.',
    'lessons.your_task': 'तुमचे कार्य / असाइनमेंट',
    'lessons.mentor_scores': 'तुमचे मार्गदर्शक गुण देतील',
    'lessons.record_answer': 'माझे उत्तर रेकॉर्ड करा',
    'lessons.record_again': 'पुन्हा रेकॉर्ड करा',

    // Home Page
    'home.greeting': 'नमस्ते',
    'home.watch_lesson': 'एक धडा पहा',
    'home.watch_lesson_desc': 'कोणताही व्हिडिओ निवडून शेवटपर्यंत पहा.',
    'home.record_task': 'तुमचे उत्तर रेकॉर्ड करा',
    'home.record_task_desc': 'असाइनमेंट उघडा आणि फोनमध्ये बोला.',
    'home.read_notes': 'मार्गदर्शकांच्या नोंदी वाचा',
    'home.read_notes_desc': 'एक-दोन दिवसांनी अभिप्राय तपासा — प्रत्यक्ष मार्गदर्शक हे लिहितात.',
    'home.work_plan': 'तुमच्या योजनेवर काम करा',
    'home.work_plan_desc': 'नोंदींवरून लहान पावले उचला.',
    'home.practice_word': 'शब्दाचा सराव करा',
    'home.your_level': 'तुमची पातळी',
    'home.leaderboard': 'लीडरबोर्ड',
    'home.languages': 'भाषा',
    'home.your_mentor': 'तुमचे मार्गदर्शक',
    'home.quote': 'तुमच्या गतीने शिका, तुमच्या भाषेत.',

    // Live Page
    'live.title': 'थेट व्याख्याने',
    'live.upcoming': 'आगामी',
    'live.mine': 'माझे वर्ग',
    'live.recordings': 'रेकॉर्डिंग',
    'live.all_skills': 'सर्व कौशल्ये',
    'live.only_my_lang': 'फक्त माझ्या भाषेत',
    'live.no_classes': 'कोणतेही सत्र नियोजित नाही',
    'live.no_classes_sub': 'मार्गदर्शक येथे गट सत्रे आयोजित करतात. दरम्यान रेकॉर्डिंग टॅब पहा.',

    // Mascot
    'mascot.study_buddy': 'स्टडी बडी',
    'mascot.online': 'ऑनलाइन',
    'mascot.fun_time': 'फन टाइम',
    'mascot.fun_time_desc': 'खेळ आणि सराव करा',
    'mascot.ai_support': 'एआय मदत',
    'mascot.ai_support_desc': '२४/७ त्वरित मदत मिळवा',
    'mascot.signed_out': 'मी तुमचा स्टडी बडी आहे. साइन इन करा आणि मी तुम्हाला सर्व दाखवेन.',
    'mascot.account_line': 'तुमचा डेटा, तुमचा निर्णय. येथून डाउनलोड करा किंवा काढून टाका.',
    'mascot.profile_line': 'विद्यार्थी तुम्हाला निवडण्यापूर्वी ही माहिती वाचतात.',
    'mascot.lessons_line': 'व्याख्याने, मॉड्यूलनुसार. पूर्ण लक्षपूर्वक पहा.',
    'mascot.live_line': 'थेट वर्ग वेळेवर होतात. थेट सहभागी व्हा किंवा रेकॉर्डिंग पहा.',

    // Plan Page
    'plan.title': 'या आठवड्याची योजना',
    'plan.subtitle_1': 'तुमच्या मार्गदर्शकांनी लिहिलेल्या प्रत्यक्ष अभिप्रायावर आधारित.',
    'plan.subtitle_2': 'प्रत्येक बाब थेट खऱ्या अभिप्रायाशी जोडलेली आहे.',
    'plan.no_plan': 'अद्याप कोणतीही योजना नाही',
    'plan.no_plan_sub': 'मार्गदर्शकांनी तुमच्या कामाचे परीक्षण केल्यावर तुमची योजना येथे दिसेल.',
    'plan.how_made_title': 'हे कसे तयार केले गेले',
    'plan.how_made_desc_1': 'तुमच्या मार्गदर्शकांच्या १ अभिप्रायावरून पुनर्रचित. कोणत्याही AI ने तुमचे व्हिडिओ तपासले नाहीत — मानवी मार्गदर्शकाने सांगितलेल्या गोष्टींची ही केवळ मांडणी आहे.',
    'plan.how_made_desc_plural': 'तुमच्या मार्गदर्शकांच्या {count} अभिप्रायांवरून पुनर्रचित. कोणत्याही AI ने तुमचे व्हिडिओ तपासले नाहीत — मानवी मार्गदर्शकाने सांगितलेल्या गोष्टींची ही केवळ मांडणी आहे.',
    'plan.week_of': 'आठवडा: {date}',
    'plan.done_count': '{done}/{total} पूर्ण',
    'plan.motivation_title': 'लहान पावले. मोठी प्रगती.',
    'plan.motivation_sub': 'सातत्य ठेवा!',
  },
}

/**
 * Translates a key for a specific language with fallback to English.
 */
export function t(key: string, lang: Language = 'en'): string {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.en
  if (dict && dict[key]) {
    return dict[key]
  }
  return TRANSLATIONS.en[key] || key
}

/**
 * Hook to get current language and translation helper function.
 */
export function useTranslation() {
  const { language, setLanguage } = useAuth()
  return {
    language,
    setLanguage,
    t: (key: string) => t(key, language),
  }
}

const SKILL_TRANSLATIONS: Record<string, { hi: string; mr: string }> = {
  'active listening': { hi: 'सक्रिय श्रवण', mr: 'लक्षपूर्वक ऐकणे' },
  'structure': { hi: 'संरचना', mr: 'मांडणी' },
  'clarity': { hi: 'स्पष्टता', mr: 'स्पष्टता' },
  'vocabulary': { hi: 'शब्दसंग्रह', mr: 'शब्दभांडार' },
  'confidence': { hi: 'आत्मविश्वास', mr: 'आत्मविश्वास' },
  'eye contact': { hi: 'दृष्टि संपर्क', mr: 'नजरेचा संपर्क' },
  'body language': { hi: 'शारीरिक हावभाव', mr: 'देहबोली' },
}

const TASK_TRANSLATIONS: Record<string, { hi: string; mr: string }> = {
  'make your gd opening': { hi: 'अपना जीडी आरंभ प्रस्तुत करें', mr: 'तुमची जीडी सुरुवात सादर करा' },
  'record your self-introduction': { hi: 'अपना आत्म-परिचय रिकॉर्ड करें', mr: 'तुमची स्वतःची ओळख रेकॉर्ड करा' },
  'explain a technical concept simply': { hi: 'तकनीकी अवधारणा सरलता से समझाएं', mr: 'तांत्रिक संकल्पना सोप्या भाषेत सांगा' },
  'answer: "tell me about yourself"': { hi: 'उत्तर दें: "अपने बारे में बताएं"', mr: 'उत्तर द्या: "तुमच्याबद्दल सांगा"' },
}

const NEXT_STEP_TRANSLATIONS: Record<string, { hi: string; mr: string }> = {
  'ok': { hi: 'ठीक है', mr: 'ठीक आहे' },
  'rerecord using a fixed 3-part structure: 1 line intro, 1 line strength, 1 line goal.': {
    hi: 'निश्चित 3-भाग संरचना का उपयोग करके पुनः रिकॉर्ड करें: 1 पंक्ति परिचय, 1 पंक्ति क्षमता, 1 पंक्ति लक्ष्य।',
    mr: 'निश्चित ३-भाग मांडणी वापरून पुन्हा रेकॉर्ड करा: १ ओळ परिचय, १ ओळ बलस्थान, १ ओळ ध्येय.',
  },
}

export function translatePlanTitle(title: string, lang: Language = 'en'): string {
  if (lang === 'en') return title
  const trimmedLower = title.trim().toLowerCase()
  if (NEXT_STEP_TRANSLATIONS[trimmedLower]) {
    return NEXT_STEP_TRANSLATIONS[trimmedLower][lang] || title
  }

  // Match pattern: "Practise {skill} — record one 60-second take this week"
  const match = title.match(/^Practise\s+(.+?)\s+—\s+record one 60-second take this week$/i)
  if (match && match[1]) {
    const rawSkill = match[1]
    const skillKey = rawSkill.trim().toLowerCase()
    const skillLocalized = SKILL_TRANSLATIONS[skillKey]?.[lang] || rawSkill
    if (lang === 'hi') {
      return `${skillLocalized} का अभ्यास करें — इस सप्ताह एक 60-सेकंड का टेक रिकॉर्ड करें`
    }
    if (lang === 'mr') {
      return `${skillLocalized} चा सराव करा — या आठवड्यात ६० सेकंदांचा एक टेक रेकॉर्ड करा`
    }
  }
  return title
}

export function translatePlanWhy(why: string, lang: Language = 'en'): string {
  if (lang === 'en') return why

  // Pattern 1: "{mentor} set this as your next step on \"{task}\""
  const nextStepMatch = why.match(/^(.+?)\s+set this as your next step on\s+"([^"]+)"$/i)
  if (nextStepMatch && nextStepMatch[1] && nextStepMatch[2]) {
    const mentor = nextStepMatch[1]
    const rawTask = nextStepMatch[2]
    const taskLocalized = TASK_TRANSLATIONS[rawTask.toLowerCase()]?.[lang] || rawTask
    if (lang === 'hi') {
      return `${mentor} ने "${taskLocalized}" पर इसे आपके अगले कदम के रूप में निर्धारित किया`
    }
    if (lang === 'mr') {
      return `${mentor} यांनी "${taskLocalized}" वर हे तुमचे पुढील पाऊल म्हणून सुचवले`
    }
  }

  // Pattern 2: "{mentor} scored you {score}/{max} on {skill} in \"{task}\""
  const scoreMatch = why.match(/^(.+?)\s+scored you\s+(\d+\/\d+)\s+on\s+(.+?)\s+in\s+"([^"]+)"$/i)
  if (scoreMatch && scoreMatch[1] && scoreMatch[2] && scoreMatch[3] && scoreMatch[4]) {
    const mentor = scoreMatch[1]
    const score = scoreMatch[2]
    const rawSkill = scoreMatch[3]
    const rawTask = scoreMatch[4]
    const skillLocalized = SKILL_TRANSLATIONS[rawSkill.toLowerCase()]?.[lang] || rawSkill
    const taskLocalized = TASK_TRANSLATIONS[rawTask.toLowerCase()]?.[lang] || rawTask
    if (lang === 'hi') {
      return `${mentor} ने "${taskLocalized}" में ${skillLocalized} पर आपको ${score} अंक दिए`
    }
    if (lang === 'mr') {
      return `${mentor} यांनी "${taskLocalized}" मधील ${skillLocalized} साठी तुम्हाला ${score} गुण दिले`
    }
  }

  return why
}
