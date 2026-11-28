// کاتالوگ غذا (بخش 1): نان، برنج، غلات، صبحانه، لبنیات، تخم‌مرغ. هر خط:
// نام فارسی | نام انگلیسی | کالری | پروتئین | کربوهیدرات | چربی | مترادف‌ها (با ;)
// همه‌ی مقادیر به‌ازای 100 گرم (یا 100 میلی‌لیتر برای نوشیدنی).
export const STAPLES = `
نان نون ساده|Plain flat bread|270|9|54|2|نون
نان بربری کنجدی|Sesame barbari bread|285|9.5|52|4|
نان تافتون کنجدی|Sesame taftoon bread|275|9|53|3|
نان سنگک کامل|Whole-wheat sangak bread|250|10|48|2|سنگک سبوس دار
نان جو|Barley bread|250|8|50|1.5|
نان جو سبوس‌دار|Whole barley bread|240|9|46|2|
نان ذرت|Cornbread|270|6|38|10|
نان خشک|Dry bread|380|12|75|3|
نان حجیم|Voluminous flat bread|265|8.5|53|2|
نان فانتزی|Fantasy bread roll|285|9|52|4|
نان همبرگر|Hamburger bun|270|9|50|4|
نان هات‌داگ|Hot dog bun|280|9|50|5|
نان باگت ساندویچی|Sandwich baguette|265|9|52|2|
نان تست سبوس‌دار|Whole-wheat toast bread|250|10|43|3|
نان تست سفید|White toast bread|265|8|49|3.5|
نان پیتا|Pita bread|275|9|55|1.2|
نان تورتیلا|Flour tortilla|300|8|50|7|
نان تورتیلا ذرت|Corn tortilla|220|6|45|3|
نان نایلونی|Thin flat bread (naan nayloni)|275|9|55|2|
نان قندی|Sweet bread|320|8|58|6|
نان شیرمال|Sheermal bread|330|8|55|9|
نان روغنی|Oily bread|340|8|50|12|
نان گردو|Walnut bread|290|9|45|9|
نان برنجی|Rice bread|240|5|50|2|
نان ساج|Saj bread|265|9|54|1.5|
نان کماج|Komaj bread|260|8|52|2|
نان خرمایی|Date bread|300|7|58|5|
نان کرفس|Celery bread|265|9|53|2|
نان لواش سبوس‌دار|Whole-wheat lavash|250|10|48|2|
نان بدون گلوتن|Gluten-free bread|250|3|45|6|
نان برنج کره‌ای|Korean rice cake|230|4|52|0.5|
نان چاپاتی|Chapati|297|9|46|8|
نان نیمه‌شیرین|Soft sweet roll|310|8|55|6|
نان گلگلی|Golgoli bread|270|9|52|3|
نان رول|Dinner roll|290|9|50|5|
نان کروسان ساده|Plain croissant|406|8|46|21|
نان بیگل|Bagel|250|10|49|1.5|
نان انگلیسی مافین|English muffin|235|8|46|2|
نان اسنک پتیت|Bread sticks|410|11|68|10|
نان ساندویچی گندم|Whole-wheat sandwich bread|245|10|44|3|
نان جو دوسر|Oat bread|255|10|44|4|
نان چاودار|Rye bread|259|8.5|48|3.3|
نان سیر|Garlic bread|350|8|45|15|
نان خامه‌ای|Cream bun|330|7|45|14|
نان کنجدی|Sesame bread|290|10|50|5|
برنج سفید خام|Raw white rice|360|7|79|0.6|برنج خام
برنج قهوه‌ای خام|Raw brown rice|362|7.5|76|2.7|
برنج کته|Plain steamed rice (kateh)|140|2.7|30|0.6|کته
برنج دمی|Dami rice|135|2.6|29|0.5|
برنج آبکش|Drained rice (abkesh)|150|2.8|31|1.5|چلو
چلو ساده|Plain chelow rice|165|3|33|2.5|چلو
چلو با کره|Chelow rice with butter|190|3|33|5|
ته‌دیگ برنج|Rice tahdig|240|3|38|9|ته دیگ
ته‌دیگ سیب‌زمینی|Potato tahdig|210|2.5|28|10|
ته‌دیگ نان|Bread tahdig|260|5|35|10|
پلو ساده|Plain polo|165|3|33|2.5|
باقالی پلو|Baghali polo (dill fava rice)|160|4|29|3|باقلا پلو
شویدپلو|Shevid polo (dill rice)|155|3|29|3|شوید پلو
سبزی پلو|Sabzi polo (herb rice)|150|3|29|2.5|
زرشک پلو|Zereshk polo (barberry rice)|165|3|32|3|
البالو پلو|Albaloo polo (sour cherry rice)|170|3|33|3|آلبالو پلو
شیرین پلو|Shirin polo (sweet rice)|185|3|36|4|
هویج پلو|Carrot rice|165|3|31|3.5|
کلم پلو|Cabbage rice (kalam polo)|150|3.5|26|3.5|
لوبیا پلو ساده|Green bean rice (loobia polo, plain)|150|3|28|3|
عدس پلو ساده|Lentil rice (adas polo, plain)|165|5|30|3|
دمی گوجه|Tomato dami rice|140|3|26|3|دمی گوجه فرنگی
استامبولی پلو|Estamboli polo|155|3.5|26|4.5|
ماش پلو|Mung bean rice|160|4.5|29|3|
تاچین زعفرانی|Tahchin saffron rice cake|215|8|27|8|ته‌چین
ته‌چین اسفناج|Spinach tahchin|200|8|24|8|
ته‌چین بادمجان|Eggplant tahchin|195|7|25|7.5|
کته ماست|Rice with yogurt|150|4|27|2.5|
پلو مرغ|Rice with chicken|180|10|25|4.5|
پلو مخلوط|Mixed rice (morasa polo)|185|4|32|4.5|مرصع پلو
مرصع پلو|Morasa polo (jeweled rice)|190|4|32|5|
قنبر پلو|Ghanbar polo|175|6|28|4|
نخود پلو|Chickpea rice|170|5|30|3|
پلو با ماهی|Rice with fish|165|8|24|4|
ماکارونی خام|Raw macaroni|358|12.5|72|1.5|
اسپاگتی خام|Raw spaghetti|360|12.5|73|1.5|
پنه پخته|Cooked penne|158|5.8|31|0.9|
فتوچینی پخته|Cooked fettuccine|158|5.8|31|0.9|
لازانیا ورقه‌ای پخته|Cooked lasagna sheets|150|5.5|30|0.9|
ماکارونی سبوس‌دار پخته|Cooked whole-wheat pasta|124|5.3|26|0.5|
ماکارونی با سس گوجه|Pasta with tomato sauce|135|4.5|25|2|
ماکارونی با پنیر|Macaroni and cheese|165|7|20|6|
ماکارونی با گوشت چرخ‌کرده|Macaroni with ground meat|170|8|20|6|ماکارونی ایرانی
ماکارونی با مرغ|Macaroni with chicken|160|9|20|5|
ماکارونی با قارچ|Macaroni with mushroom|150|5|22|4.5|
نودل فوری خام|Raw instant noodles|450|9|62|18|رامن فوری
نودل فوری پخته|Cooked instant noodles|205|4.5|28|8|
رشته فرنگی پخته|Cooked vermicelli|150|5|30|0.8|
رشته پلویی|Rice noodles (reshteh polo)|370|10|75|2|
رشته خوشکار|Reshteh khoshkar|265|6|40|9|
رشته برنج پخته|Cooked rice noodles|109|1.8|25|0.2|
کوسکوس پخته|Cooked couscous|112|3.8|23|0.2|
بلغور گندم خام|Raw bulgur|342|12|76|1.3|
جو پرک خام|Raw rolled barley|353|12|73|2.3|
جو پوست‌کنده خام|Raw hulled barley|354|12.5|73|2.3|
جو پخته|Cooked barley|123|2.3|28|0.4|
گندم پخته|Cooked wheat berries|130|5|27|0.9|
گندم برشته|Roasted wheat|360|12|72|2|
ارزن پخته|Cooked millet|119|3.5|23.7|1|
ذرت بوداده|Roasted corn|365|9|74|4.5|
ذرت خام|Raw corn|365|9.4|74|4.7|
آرد گندم|Wheat flour|364|10|76|1|
آرد سفید|White flour|364|10|76|1|
آرد کامل|Whole-wheat flour|340|13|72|2.5|
آرد برنج|Rice flour|366|6|80|1.4|
آرد ذرت|Corn flour|361|7|77|3.9|
آرد نخودچی|Chickpea flour|387|22|58|6.7|
آرد جو|Barley flour|345|10|74|1.6|
آرد سویا|Soy flour|436|34|35|20|
آرد بادام|Almond flour|600|21|20|53|
آرد نارگیل|Coconut flour|400|18|60|14|
نشاسته ذرت|Corn starch|381|0.3|91|0.1|
نشاسته گندم|Wheat starch|360|0.5|88|0.1|
پودر سوخاری|Breadcrumbs|395|13|72|5|سوخاری
پودر کیک|Cake mix|400|4|85|6|
کینوا خام|Raw quinoa|368|14|64|6|
دانه چیا|Chia seeds|486|17|42|31|چیا
دانه کتان|Flaxseed|534|18|29|42|بذر کتان
تخم شربتی|Basil seeds (tokhm sharbati)|230|14|43|3|
تخم شربتی خیسانده|Soaked basil seeds|35|2|6|0.5|
دانه کنف|Hemp seeds|553|32|9|49|
سبوس گندم|Wheat bran|216|15.5|29|4.3|
سبوس جو دوسر|Oat bran|246|17|29|7|
جوانه گندم|Wheat germ|360|23|52|10|
گرانولا|Granola|471|10|64|20|
موسلی|Muesli|365|10|66|6|
بیسکویت صبحانه|Breakfast biscuit|440|7|68|15|
حبوبات صبحانه شکلاتی|Chocolate breakfast cereal|380|6|80|3.5|
شکلات صبحانه|Chocolate cereal|385|6|80|4|
فروت لوپس|Fruit loops cereal|385|6|85|3|
کورن‌فلکس عسلی|Honey corn flakes|380|5|85|1.5|
پروتئین بار غلات|Cereal bar|390|7|70|10|
پوره جو دوسر|Oatmeal porridge with milk|115|5|18|3|فرنی جو
شیر برنج|Rice pudding|130|3.5|22|3|
فرنی|Ferni (rice flour pudding)|130|3.2|22|3|
فرنی زعفرانی|Saffron ferni|135|3.2|23|3.2|
شله زرد|Sholeh zard (saffron rice pudding)|165|1.5|36|2.5|
شله مشهدی|Sholeh Mashhadi|140|6|18|5|
حریره بادام|Harireh badam (almond pudding)|150|3|18|7|
کاچی|Kachi|260|3|38|11|
حلوای آرد|Flour halva (halva ard)|450|4|58|23|حلوا
حلوای خرما|Date halva|380|4|55|16|
سمنو|Samanu|240|5|48|3|
سمنو با شیره|Samanu with syrup|250|5|50|3|
عدس‌پلو صبحانه|Lentil rice breakfast|150|5|26|3|
عدسی|Adasi (lentil breakfast soup)|110|6|17|2|
عدسی با تخم‌مرغ|Adasi with egg|135|8|16|4|
آبگوشت صبحانه|Abgoosht breakfast|130|8|10|6|
کله‌پاچه|Kalleh pacheh|170|14|0.5|12|کله پاچه
نیمرو با روغن|Fried egg (in oil)|196|13.6|0.8|15|
نیمرو بدون روغن|Fried egg (no oil)|155|13|1.1|11|
تخم‌مرغ عسلی|Soft boiled egg|143|12.6|0.7|9.5|
تخم‌مرغ کامل خام|Raw whole egg|143|12.6|0.7|9.5|
سفیده تخم‌مرغ|Egg white|52|11|0.7|0.2|
زرده تخم‌مرغ|Egg yolk|322|16|3.6|27|
تخم‌مرغ نیم‌پز|Poached egg|143|12.5|0.7|9.5|
تخم‌مرغ نیمرو با پنیر|Fried egg with cheese|220|14|1|17|
املت گوجه|Tomato omelette|130|7|5|9|املت گوجه فرنگی
املت قارچ|Mushroom omelette|135|8|3|10|
املت سبزیجات|Vegetable omelette|120|7|4|8|
املت پنیر|Cheese omelette|210|13|2|17|
املت سوسیس|Sausage omelette|240|12|3|20|
املت اسفناج|Spinach omelette|130|9|3|9|
میرزا قاسمی با تخم‌مرغ|Mirza ghasemi with egg|105|4|7|7|
کوکو سیب‌زمینی|Potato kuku|180|6|17|10|
کوکو بادمجان|Eggplant kuku|150|5|8|11|
کوکو کدو|Zucchini kuku|130|6|7|9|
کوکو مرغ|Chicken kuku|170|13|7|10|
کوکو لوبیا سبز|Green bean kuku|145|6|9|9|
کوکو گل‌کلم|Cauliflower kuku|140|8|7|9|
کوکو قارچ|Mushroom kuku|135|7|6|9|
کوکو هویج|Carrot kuku|140|5|11|8|
کوکو نخودفرنگی|Pea kuku|150|7|11|8|
کوکو عدس|Lentil kuku|160|9|15|7|
کوکو کلم|Cabbage kuku|130|6|8|8|
کوکو شیرین|Sweet kuku|220|7|25|10|
کوکو فرنگی|Kuku farangi|160|7|13|9|
نرگسی اسفناج|Spinach narges|105|6|5|7|
نرگسی|Nargesi|105|6|5|7|
نرگسی اسفناج و تخم‌مرغ|Spinach and egg narges|115|7|5|8|
نان و پنیر و گردو|Bread, cheese and walnut|290|11|30|14|
نان و پنیر|Bread with cheese|285|12|35|10|
نان و خامه عسل|Bread with cream and honey|340|4|45|16|نان خامه عسل
نان و کره مربا|Bread, butter and jam|320|5|48|12|
نان و حلوا ارده|Bread with tahini halva|390|8|55|16|
نان و کره|Bread and butter|330|6|40|16|
نان و عسل|Bread and honey|290|7|60|3|
نان و پنیر و سبزی|Bread, cheese and herbs|265|11|32|9|
نان و تخم‌مرغ|Bread and egg|240|11|25|10|
ساندویچ تخم‌مرغ|Egg sandwich|240|11|24|11|
ساندویچ نیمرو|Fried egg sandwich|250|11|23|13|
ساندویچ پنیر و گوجه|Cheese and tomato sandwich|220|10|26|8|
ساندویچ کره و مربا|Butter and jam sandwich|310|5|50|10|
ساندویچ کره بادام‌زمینی و مربا|Peanut butter and jelly sandwich|340|10|45|14|
لقمه نان و پنیر|Bread cheese roll|265|11|32|9|
لقمه کره و عسل|Butter honey roll|330|5|45|15|
پنکیک شکلاتی|Chocolate pancake|290|6|44|10|
پنکیک عسلی|Honey pancake|260|6|40|8|
پنکیک بدون قند|Sugar-free pancake|190|8|28|5|
پنکیک جو دوسر|Oat pancake|180|8|25|5|
کرپ شکلاتی|Chocolate crepe|270|6|36|11|
کرپ ساده|Plain crepe|200|7|29|6|
کرپ موز نوتلا|Banana Nutella crepe|290|5|42|11|
فرنچ توست|French toast|229|7.7|25|11|
نان تست املت|Toast with omelette|250|10|22|13|
اوتمیل با موز|Oatmeal with banana|110|3.5|21|2|
اوتمیل با شیر|Oatmeal with milk|120|5|18|3.5|
اوتمیل با عسل و گردو|Oatmeal with honey and walnuts|160|5|23|5.5|
پودینگ چیا|Chia pudding|150|5|15|8|
اسموتی کاسه|Smoothie bowl|120|3|23|2|
`;
