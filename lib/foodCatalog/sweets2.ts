// کاتالوگ غذا: شیرینی، قنادی، کافه و بستنی (بخش دوم). قالب خط مثل snacks.ts؛ مقدار به‌ازای 100 گرم (یا میلی‌لیتر).
const S1 = `
باقلوای یزدی|Yazdi baklava|472|7|48|28|باقلوا یزد
باقلوای قزوینی|Qazvini baklava|498|7|50|30|باقلوا قزوین
باقلوای تبریزی|Tabrizi baklava|467|7|49|27|
باقلوای شیرازی|Shirazi baklava|466|6|52|26|
باقلوای کرمانشاهی|Kermanshahi baklava|477|7|47|29|
باقلوای ترکی پسته‌ای|Turkish pistachio baklava|478|7|45|30|باقلوا پسته
باقلوای گردویی|Walnut baklava|491|7|46|31|
باقلوای نارگیلی|Coconut baklava|453|5|52|25|
باقلوای خانگی|Homemade baklava|467|6|50|27|
قطاب یزدی|Yazdi qottab|466|8|50|26|قطاب
قطاب بادامی|Almond qottab|476|9|47|28|
قطاب گردویی|Walnut qottab|477|8|46|29|
قطاب خانگی|Homemade qottab|457|8|50|25|
پشمک یزد|Pashmak Yazd|432|1|80|12|پشمک
پشمک تبریزی|Tabrizi pashmak|427|1|81|11|
پشمک پسته‌ای|Pistachio pashmak|434|3|74|14|
پشمک زعفرانی|Saffron pashmak|432|1|80|12|
پشمک نارگیلی|Coconut pashmak|429|2|76|13|
پشمک کاکائویی|Cocoa pashmak|429|2|76|13|
نان نخودچی کرمانشاهی|Kermanshahi chickpea cookie|470|8|60|22|
نان نخودچی با هل|Cardamom chickpea cookie|470|8|60|22|
نان نخودچی با پسته|Pistachio chickpea cookie|484|9|58|24|
نان نخودچی با نارگیل|Coconut chickpea cookie|494|7|58|26|
نان نخودچی با گلاب|Rosewater chickpea cookie|470|8|60|22|
نان برنجی کرمانی|Kermani rice flour cookie|480|6|60|24|
نان برنجی با پسته|Pistachio rice flour cookie|490|7|57|26|
نان برنجی با زعفران|Saffron rice flour cookie|480|6|60|24|
نان برنجی کنجدی|Sesame rice flour cookie|490|7|57|26|
نان پادرازی|Padrazi bread cookie|480|8|58|24|پادرازی
نان پادرازی کرمانشاه|Padrazi Kermanshah|480|8|58|24|
کلوچه فومن|Fuman kolucheh|472|7|48|28|کلوچه گیلان
کلوچه رشتی|Rashti kolucheh|472|7|48|28|
کلوچه گردویی شمال|Northern walnut kolucheh|500|8|45|32|
کلوچه سنتی با خرما|Traditional date kolucheh|442|6|55|22|
کلوچه اراک|Arak kolucheh|452|7|52|24|
کلوچه مشهدی|Mashhadi kolucheh|447|7|53|23|
کلوچه کرمانشاه|Kermanshah kolucheh|461|7|52|25|
کلوچه عیدانه|Eid kolucheh|461|7|52|25|
کماج|Komaj|450|8|55|22|کماج تبریز
کماج سنتی|Traditional komaj|445|8|56|21|
کماج با شیره|Komaj with grape syrup|430|7|60|18|
کاک|Kaak|456|9|60|20|کاک شیرینی
کاک کنجدی|Sesame kaak|462|10|56|22|
کاک زنجبیلی|Ginger kaak|446|9|62|18|
کاک روغنی|Buttery kaak|490|8|56|26|
کاک تبریزی|Tabrizi kaak|466|9|58|22|
گوش فیل|Elephant ear pastry|484|5|62|24|گوش‌فیل
گوش فیل شکری|Sugared elephant ear pastry|486|4|68|22|
گوش فیل با هل|Cardamom elephant ear pastry|484|5|62|24|
نازک|Nazook|470|6|62|22|نازک اصفهان
نازک شیرین|Sweet nazook|464|6|65|20|
نازک خامه‌ای|Cream nazook|496|6|55|28|
قرابیه تبریز|Tabriz qurabiya|520|8|50|32|قراپیه;قرابیه
قرابیه بادامی|Almond qurabiya|526|9|46|34|
قرابیه مربایی|Jam qurabiya|504|7|56|28|
قرابیه خانگی|Homemade qurabiya|511|8|50|31|
قرابیه کره‌ای|Butter qurabiya|524|7|52|32|
قرابیه پسته‌ای|Pistachio qurabiya|521|9|47|33|
لوز بادام‌زمینی|Peanut luz|508|12|52|28|
لوز شکلاتی|Chocolate luz|508|8|56|28|
مسقطی|Moscati|210|1|38|6|حلوای مسقطی
مسقطی اصفهان|Isfahan moscati|210|1|38|6|
مسقطی لاهیجان|Lahijan moscati|210|1|38|6|
مسقطی زعفرانی|Saffron moscati|210|1|38|6|
مسقطی پسته‌ای|Pistachio moscati|233|3|35|9|
باسلوق گردویی|Walnut basloq|410|5|66|14|
باسلوق بادام|Almond basloq|401|5|66|13|
باسلوق تبریز|Tabriz basloq|372|3|72|8|
باسلوق پسته‌ای|Pistachio basloq|402|5|64|14|
باسلوق کشمشی|Raisin basloq|380|3|74|8|
راحت‌الحلقوم|Turkish delight|336|1|82|0.5|راحت الحلقوم
راحت‌الحلقوم گلی|Rose Turkish delight|336|1|82|0.5|
راحت‌الحلقوم پسته‌ای|Pistachio Turkish delight|368|4|70|8|
راحت‌الحلقوم لیمویی|Lemon Turkish delight|336|1|82|0.5|
راحت‌الحلقوم نارگیلی|Coconut Turkish delight|376|2|74|8|
راحت‌الحلقوم گردویی|Walnut Turkish delight|369|4|68|9|
راحت‌الحلقوم زعفرانی|Saffron Turkish delight|336|1|82|0.5|
گز شیراز|Shirazi gaz|434|5|72|14|
گز خوانسار|Khansar gaz|434|5|72|14|
گز بیدمشک|Bidmeshk gaz|448|6|70|16|
گز با مغز|Nut-filled gaz|455|7|64|19|
گز اصفهان با پسته|Isfahan pistachio gaz|460|8|62|20|
گز شکلاتی|Chocolate gaz|450|6|66|18|
سوهان قم زعفرانی|Saffron Qom sohan|488|6|62|24|
سوهان روغنی|Buttery sohan|502|5|62|26|
سوهان گردویی|Walnut sohan|503|8|57|27|
سوهان اسکوتی|Eskuti sohan|474|5|64|22|
سوهان کرمانشاه|Kermanshah sohan|498|6|60|26|
زولبیا گلاب|Rosewater zoolbia|414|3|60|18|
زولبیا زعفرانی|Saffron zoolbia|414|3|60|18|
رشته خشکار|Rashteh khoshkar|482|7|55|26|رشته‌خشکار
رشته خشکار شیرین|Sweet rashteh khoshkar|482|7|55|26|
حلوا ارده شکلاتی|Chocolate halva ardeh|542|13|46|34|
حلوای رشته‌ای|Thread halva|362|3|65|10|
حلوای گردو|Walnut halva|484|8|50|28|
حلوای هویج|Carrot halva|248|3|32|12|
حلوای کدو|Pumpkin halva|264|3|36|12|
حلوای زرد|Yellow halva|305|2|45|13|
حلوای سمنو|Samanu halva|296|2|45|12|
حلوای آرد برنج|Rice flour halva|334|2|50|14|
حلوای شکری با پسته|Pistachio halva shekari|422|5|60|18|
حلوای ارده کنجدی|Sesame tahini halva|514|15|46|30|
سوهان نوروزی|Nowruz sohan|498|6|60|26|
نان نارگیلی|Persian coconut cookie|482|6|56|26|شیرینی نارگیلی
نان کشمشی|Raisin cookie Persian|462|6|60|22|
نان شیرمالی|Sheermal flatbread sweet|326|9|50|10|شیرمال
نان شکری|Nan shekari|480|8|58|24|
نان عسلی|Honey cookie Persian|466|7|60|22|
نان جوزی|Nutmeg cookie|481|8|56|25|
نان فندقی|Hazelnut cookie Persian|496|9|52|28|
نان زنجبیلی|Persian ginger cookie|456|7|62|20|
حاجی بادام|Haji badam|522|11|52|30|حاجی‌بادوم
حاجی بادام گلی|Rose haji badam|522|11|52|30|
حاجی بادام شکلاتی|Chocolate haji badam|514|11|50|30|
نقل|Noghl sugar-coated almond|420|8|70|12|نقل عروسی
نقل بادام|Almond noghl|435|9|66|15|
نقل نخودچی|Chickpea noghl|382|6|76|6|
نقل شکری|Sugar noghl|388|0|97|0|
نبات زنجبیلی|Ginger rock candy|388|0|97|0|
نبات هلی|Cardamom rock candy|392|0|98|0|
قند شکسته|Broken sugar lumps|399|0|99.8|0|
قند چوبی|Stick sugar|396|0|99|0|
قند و شکر زعفرانی|Saffron sugar|396|0|99|0|
پولکی|Poolaki|369|1|80|5|پولکی اصفهان
پولکی گلی|Rose poolaki|369|1|80|5|
پولکی نعنایی|Mint poolaki|369|1|80|5|
پولکی زعفرانی|Saffron poolaki|369|1|80|5|
پولکی نارگیلی|Coconut poolaki|384|2|76|8|
پولکی لیمویی|Lemon poolaki|369|1|80|5|
پولکی شکلاتی|Chocolate poolaki|384|2|76|8|
ترشی تکه|Tarsheh tekeh fruit leather|293|1|70|1|
لواشک زردآلو|Apricot lavashak|309|1|74|1|
لواشک تمشک|Raspberry lavashak|301|1|72|1|
لواشک انبه|Mango lavashak|309|1|74|1|
لواشک تمرهندی|Tamarind lavashak|309|1|74|1|
لواشک گیلاس|Cherry lavashak|301|1|72|1|
لواشک گوجه سبز|Green plum lavashak|293|1|70|1|
لواشک شیرین|Sweet lavashak|317|1|76|1|
لواشک مخلوط|Mixed fruit lavashak|309|1|74|1|
آلوچه خشک|Dried sour plum|252|2|60|0.5|
قیسی خشک|Dried apricot roll|280|3|66|0.5|
شیرینی کشمشی کرمانشاه|Kermanshah raisin cookie|440|7|58|20|
شیرینی شیر برنج|Rice milk pastry|412|6|52|20|
شیرینی یزدی|Yazdi pastry|471|7|50|27|
شیرینی زبان خانگی|Homemade shirini zaban|454|8|56|22|
شیرینی بادام اصفهان|Isfahan almond pastry|496|9|52|28|
شیرینی نخودچی ساده|Plain chickpea pastry|470|8|60|22|
شیرینی هل|Cardamom pastry|468|7|56|24|
شیرینی زعفرانی|Saffron pastry|468|7|56|24|
چوب شیرین|Sweet stick pastry|442|6|64|18|
بیسکویت چوبی|Stick biscuit|444|9|66|16|
شیرینی تر سنتی|Traditional wet pastry|374|5|48|18|
دسر کاسترد|Custard dessert Persian|157|4|24|5|
شیرینی کرمانشاهی|Kermanshahi pastry|460|7|54|24|
شیرینی تبریزی|Tabrizi pastry|460|7|54|24|
شیرینی اصفهانی|Isfahani pastry|460|7|54|24|
شیرینی شیرازی|Shirazi pastry|460|7|54|24|
شیرینی کرمانی|Kermani pastry|460|7|54|24|
شیرینی مشهدی|Mashhadi pastry|460|7|54|24|
شیرینی شمالی|Northern pastry|460|7|54|24|
شیرینی خوزستانی|Khuzestani pastry|440|5|60|20|
شیرینی بوشهری|Bushehri pastry|450|5|58|22|
شیرینی کردستانی|Kurdish pastry|460|7|54|24|
شیرینی لری|Luri pastry|460|7|54|24|
شیرینی گیلکی|Gilaki pastry|470|7|52|26|
شیرینی ترکمنی|Turkmen pastry|468|7|56|24|
شیرینی بلوچی|Baluchi pastry|448|5|62|20|
شیرینی ارومیه|Urmia pastry|460|7|54|24|
شیرینی همدانی|Hamedani pastry|460|7|54|24|
شیرینی زنجانی|Zanjani pastry|460|7|54|24|
شیرینی قزوینی|Qazvini pastry|460|7|54|24|
شیرینی ساوه|Saveh pastry|460|7|54|24|
شیرینی قمی|Qomi pastry|460|7|54|24|
شیرینی اهواز|Ahvaz pastry|440|5|60|20|
شیرینی کاشان|Kashan pastry|460|7|54|24|
شیرینی سمنان|Semnan pastry|460|7|54|24|
شیرینی رشت|Rasht pastry|470|7|52|26|
نان قندی تبریز|Tabriz sugar bread|392|9|62|12|
سمبوسه شیرین|Sweet sambusa|418|5|50|22|
رولت شیرین سنتی|Traditional sweet roll|394|6|52|18|
شیرینی پنجره‌ای|Window pastry|472|3|52|28|
شیرینی گل‌سرخی|Rose pastry|446|6|56|22|
حلوا شکری با آرد برنج|Rice flour halva shekari|342|2|52|14|
شیر برنج سنتی|Traditional rice pudding|132|3|22|3.5|
کاچی زعفرانی|Saffron kachi|221|3|32|9|
خوراک عدس شیرین|Sweet lentil dessert|194|5|30|6|
سمنو سنتی|Traditional samanu|163|3|31|3|
سمنو با گلاب|Samanu with rosewater|159|3|30|3|
سمنو با زعفران|Samanu with saffron|159|3|30|3|
شله زرد نذری|Nazri sholeh zard|151|1|30|3|
شله زرد با بادام|Almond sholeh zard|164|2|30|4|
شله زرد با پسته|Pistachio sholeh zard|164|2|30|4|
فرنی با گلاب|Ferni with rosewater|113|3.5|18|3|
فرنی با هل|Ferni with cardamom|113|3.5|18|3|
فرنی شکلاتی|Chocolate ferni|126|3.5|20|3.5|
فرنی با خرما|Ferni with dates|137|3.5|24|3|
شیربرنج|Shir berenj|119|3|20|3|شیر برنج
شیربرنج با دارچین|Cinnamon shir berenj|119|3|20|3|
شیربرنج زعفرانی|Saffron shir berenj|119|3|20|3|
شیربرنج با گلاب|Rosewater shir berenj|119|3|20|3|
شیربرنج با عسل|Honey shir berenj|131|3|23|3|
شیربرنج با پسته|Pistachio shir berenj|136|4|21|4|
شیربرنج کم‌چرب|Low-fat shir berenj|101|3|20|1|
حریره بادام سنتی|Traditional almond harireh|125|3|17|5|
حلیم شیرین|Sweet haleem|204|7|26|8|
حلیم بادمجان شیرین|Sweet eggplant haleem|178|5|26|6|
فالوده با گلاب|Faloodeh with rosewater|101|0.5|24|0.3|
فالوده با شربت آلبالو|Faloodeh with sour cherry syrup|117|0.5|28|0.3|
فالوده با شربت به‌لیمو|Faloodeh with lime syrup|109|0.5|26|0.3|
فالوده کاسه‌ای|Faloodeh bowl|101|0.5|24|0.3|
فالوده با زعفران|Faloodeh with saffron|101|0.5|24|0.3|
فالوده با سکنجبین|Faloodeh with sekanjabin|109|0.5|26|0.3|
فالوده با نارنج|Faloodeh with bitter orange|101|0.5|24|0.3|
کاسه فالوده و بستنی|Faloodeh bowl with ice cream|186|3|30|6|
بستنی سنتی با فالوده|Traditional ice cream with faloodeh|178|3|28|6|
کیک یزدی ساده|Plain Yazdi cake|382|5|50|18|
کیک یزدی با گلاب|Rosewater Yazdi cake|382|5|50|18|
کیک یزدی با هل|Cardamom Yazdi cake|382|5|50|18|
کیک یزدی با زعفران|Saffron Yazdi cake|382|5|50|18|
کیک یزدی نارگیلی|Coconut Yazdi cake|400|5|50|20|
کیک یزدی شکلاتی|Chocolate Yazdi cake|391|5|50|19|
کیک یزدی با خلال پسته|Pistachio Yazdi cake|396|6|48|20|
نان خرمایی سنتی|Traditional date cookie|438|5|64|18|
رنگینک|Rangina|360|4|50|16|
رنگینک بوشهری|Bushehri rangina|360|4|50|16|
رنگینک با گردو|Rangina with walnut|383|5|48|19|
رنگینک با پسته|Rangina with pistachio|374|5|48|18|
رنگینک با دارچین|Rangina with cinnamon|360|4|50|16|
رنگینک با خرما|Rangina with dates|359|4|52|15|
حلوا خرما|Date halva Persian|350|4|52|14|
خرما با گردو|Dates with walnut|324|3|60|8|
خرما با پسته|Dates with pistachio|316|3|58|8|
خرما با بادام|Dates with almond|320|4|58|8|
خرما با کنجد|Dates with sesame|323|3|62|7|
خرما با ارده|Dates with tahini|334|5|56|10|
خرما با نارگیل|Dates with coconut|324|3|60|8|
خرما با پنیر خامه‌ای|Dates with cream cheese|306|4|50|10|
خرمای شکلاتی|Chocolate dates|350|3|62|10|
خرمای پرشده|Stuffed dates|333|3|60|9|
توپک خرما|Date balls|332|3|62|8|
توپک خرما و نارگیل|Date coconut balls|366|4|56|14|
توپک خرما و بادام|Date almond balls|362|5|54|14|
توپک خرما و کاکائو|Date cocoa balls|348|4|56|12|
شیرینی ناپلئونی با شکلات|Napoleon with chocolate|393|6|36|25|
شیرینی ناپلئونی با توت‌فرنگی|Napoleon with strawberry|358|5|35|22|
شیرینی ناپلئونی با پسته|Napoleon with pistachio|382|7|30|26|
شیرینی ناپلئونی با قهوه|Napoleon with coffee cream|359|5|33|23|
شیرینی ناپلئونی با کارامل|Napoleon with caramel|375|5|37|23|
شیرینی ناپلئونی با موز|Napoleon with banana|358|5|35|22|
شیرینی ناپلئونی با نارگیل|Napoleon with coconut|374|5|30|26|
شیرینی ناپلئونی با فندق|Napoleon with hazelnut|395|6|32|27|
شیرینی ناپلئونی با وانیل|Napoleon with vanilla|346|5|32|22|
شیرینی ناپلئونی با لیمو|Napoleon with lemon|354|5|34|22|
شیرینی ناپلئونی با زعفران|Napoleon with saffron|342|5|31|22|
شیرینی کرم‌دار|Custard pastry|292|5|32|16|
شیرینی کرم‌دار با شکلات|Custard pastry with chocolate|347|6|38|19|
شیرینی کرم‌دار با توت‌فرنگی|Custard pastry with strawberry|312|5|37|16|
شیرینی کرم‌دار با پسته|Custard pastry with pistachio|336|7|32|20|
شیرینی کرم‌دار با قهوه|Custard pastry with coffee cream|313|5|35|17|
شیرینی کرم‌دار با کارامل|Custard pastry with caramel|329|5|39|17|
شیرینی کرم‌دار با موز|Custard pastry with banana|312|5|37|16|
شیرینی کرم‌دار با نارگیل|Custard pastry with coconut|328|5|32|20|
شیرینی کرم‌دار با فندق|Custard pastry with hazelnut|349|6|34|21|
شیرینی کرم‌دار با وانیل|Custard pastry with vanilla|300|5|34|16|
شیرینی کرم‌دار با لیمو|Custard pastry with lemon|308|5|36|16|
شیرینی کرم‌دار با زعفران|Custard pastry with saffron|296|5|33|16|
شیرینی خامه‌ای دانمارکی|Danish cream pastry|344|5|36|20|
شیرینی خامه‌ای دانمارکی با شکلات|Danish cream pastry with chocolate|399|6|42|23|
شیرینی خامه‌ای دانمارکی با توت‌فرنگی|Danish cream pastry with strawberry|364|5|41|20|
شیرینی خامه‌ای دانمارکی با پسته|Danish cream pastry with pistachio|388|7|36|24|
شیرینی خامه‌ای دانمارکی با قهوه|Danish cream pastry with coffee cream|365|5|39|21|
شیرینی خامه‌ای دانمارکی با کارامل|Danish cream pastry with caramel|381|5|43|21|
شیرینی خامه‌ای دانمارکی با موز|Danish cream pastry with banana|364|5|41|20|
شیرینی خامه‌ای دانمارکی با نارگیل|Danish cream pastry with coconut|380|5|36|24|
شیرینی خامه‌ای دانمارکی با فندق|Danish cream pastry with hazelnut|401|6|38|25|
شیرینی خامه‌ای دانمارکی با وانیل|Danish cream pastry with vanilla|352|5|38|20|
شیرینی خامه‌ای دانمارکی با لیمو|Danish cream pastry with lemon|360|5|40|20|
شیرینی خامه‌ای دانمارکی با زعفران|Danish cream pastry with saffron|348|5|37|20|
شیرینی پروفیترول|Profiterole|326|6|26|22|
شیرینی پروفیترول با شکلات|Profiterole with chocolate|381|7|32|25|
شیرینی پروفیترول با توت‌فرنگی|Profiterole with strawberry|346|6|31|22|
شیرینی پروفیترول با پسته|Profiterole with pistachio|370|8|26|26|
شیرینی پروفیترول با قهوه|Profiterole with coffee cream|347|6|29|23|
شیرینی پروفیترول با کارامل|Profiterole with caramel|363|6|33|23|
شیرینی پروفیترول با موز|Profiterole with banana|346|6|31|22|
شیرینی پروفیترول با نارگیل|Profiterole with coconut|362|6|26|26|
شیرینی پروفیترول با فندق|Profiterole with hazelnut|383|7|28|27|
شیرینی پروفیترول با وانیل|Profiterole with vanilla|334|6|28|22|
شیرینی پروفیترول با لیمو|Profiterole with lemon|342|6|30|22|
شیرینی پروفیترول با زعفران|Profiterole with saffron|330|6|27|22|
شیرینی اکلر|Eclair|298|6|28|18|
شیرینی اکلر با شکلات|Eclair with chocolate|353|7|34|21|
شیرینی اکلر با توت‌فرنگی|Eclair with strawberry|318|6|33|18|
شیرینی اکلر با پسته|Eclair with pistachio|342|8|28|22|
شیرینی اکلر با قهوه|Eclair with coffee cream|319|6|31|19|
شیرینی اکلر با کارامل|Eclair with caramel|335|6|35|19|
شیرینی اکلر با موز|Eclair with banana|318|6|33|18|
شیرینی اکلر با نارگیل|Eclair with coconut|334|6|28|22|
شیرینی اکلر با فندق|Eclair with hazelnut|355|7|30|23|
شیرینی اکلر با وانیل|Eclair with vanilla|306|6|30|18|
شیرینی اکلر با لیمو|Eclair with lemon|314|6|32|18|
شیرینی اکلر با زعفران|Eclair with saffron|302|6|29|18|
شیرینی رولت|Roulade pastry|338|6|38|18|
شیرینی رولت با شکلات|Roulade pastry with chocolate|393|7|44|21|
شیرینی رولت با توت‌فرنگی|Roulade pastry with strawberry|358|6|43|18|
شیرینی رولت با پسته|Roulade pastry with pistachio|382|8|38|22|
شیرینی رولت با قهوه|Roulade pastry with coffee cream|359|6|41|19|
شیرینی رولت با کارامل|Roulade pastry with caramel|375|6|45|19|
شیرینی رولت با موز|Roulade pastry with banana|358|6|43|18|
شیرینی رولت با نارگیل|Roulade pastry with coconut|374|6|38|22|
شیرینی رولت با فندق|Roulade pastry with hazelnut|395|7|40|23|
شیرینی رولت با وانیل|Roulade pastry with vanilla|346|6|40|18|
شیرینی رولت با لیمو|Roulade pastry with lemon|354|6|42|18|
شیرینی رولت با زعفران|Roulade pastry with saffron|342|6|39|18|
شیرینی میلفوی|Mille-feuille|364|5|32|24|
شیرینی میلفوی با شکلات|Mille-feuille with chocolate|419|6|38|27|
شیرینی میلفوی با توت‌فرنگی|Mille-feuille with strawberry|384|5|37|24|
شیرینی میلفوی با پسته|Mille-feuille with pistachio|408|7|32|28|
شیرینی میلفوی با قهوه|Mille-feuille with coffee cream|385|5|35|25|
شیرینی میلفوی با کارامل|Mille-feuille with caramel|401|5|39|25|
شیرینی میلفوی با موز|Mille-feuille with banana|384|5|37|24|
شیرینی میلفوی با نارگیل|Mille-feuille with coconut|400|5|32|28|
شیرینی میلفوی با فندق|Mille-feuille with hazelnut|421|6|34|29|
شیرینی میلفوی با وانیل|Mille-feuille with vanilla|372|5|34|24|
شیرینی میلفوی با لیمو|Mille-feuille with lemon|380|5|36|24|
شیرینی میلفوی با زعفران|Mille-feuille with saffron|368|5|33|24|
شیرینی کانولی|Cannoli|320|6|38|16|
شیرینی کانولی با شکلات|Cannoli with chocolate|375|7|44|19|
شیرینی کانولی با توت‌فرنگی|Cannoli with strawberry|340|6|43|16|
شیرینی کانولی با پسته|Cannoli with pistachio|364|8|38|20|
شیرینی کانولی با قهوه|Cannoli with coffee cream|341|6|41|17|
شیرینی کانولی با کارامل|Cannoli with caramel|357|6|45|17|
شیرینی کانولی با موز|Cannoli with banana|340|6|43|16|
شیرینی کانولی با نارگیل|Cannoli with coconut|356|6|38|20|
شیرینی کانولی با فندق|Cannoli with hazelnut|377|7|40|21|
شیرینی کانولی با وانیل|Cannoli with vanilla|328|6|40|16|
شیرینی کانولی با لیمو|Cannoli with lemon|336|6|42|16|
شیرینی کانولی با زعفران|Cannoli with saffron|324|6|39|16|
شیرینی کرم کاراملی|Caramel cream pastry|326|5|36|18|
شیرینی کرم کاراملی با شکلات|Caramel cream pastry with chocolate|381|6|42|21|
شیرینی کرم کاراملی با توت‌فرنگی|Caramel cream pastry with strawberry|346|5|41|18|
شیرینی کرم کاراملی با پسته|Caramel cream pastry with pistachio|370|7|36|22|
شیرینی کرم کاراملی با قهوه|Caramel cream pastry with coffee cream|347|5|39|19|
شیرینی کرم کاراملی با کارامل|Caramel cream pastry with caramel|363|5|43|19|
شیرینی کرم کاراملی با موز|Caramel cream pastry with banana|346|5|41|18|
شیرینی کرم کاراملی با نارگیل|Caramel cream pastry with coconut|362|5|36|22|
شیرینی کرم کاراملی با فندق|Caramel cream pastry with hazelnut|383|6|38|23|
شیرینی کرم کاراملی با وانیل|Caramel cream pastry with vanilla|334|5|38|18|
شیرینی کرم کاراملی با لیمو|Caramel cream pastry with lemon|342|5|40|18|
شیرینی کرم کاراملی با زعفران|Caramel cream pastry with saffron|330|5|37|18|
شیرینی ایتالیایی|Italian pastry|348|6|36|20|
شیرینی ایتالیایی با شکلات|Italian pastry with chocolate|403|7|42|23|
شیرینی ایتالیایی با توت‌فرنگی|Italian pastry with strawberry|368|6|41|20|
شیرینی ایتالیایی با پسته|Italian pastry with pistachio|392|8|36|24|
شیرینی ایتالیایی با قهوه|Italian pastry with coffee cream|369|6|39|21|
شیرینی ایتالیایی با کارامل|Italian pastry with caramel|385|6|43|21|
شیرینی ایتالیایی با موز|Italian pastry with banana|368|6|41|20|
شیرینی ایتالیایی با نارگیل|Italian pastry with coconut|384|6|36|24|
شیرینی ایتالیایی با فندق|Italian pastry with hazelnut|405|7|38|25|
شیرینی ایتالیایی با وانیل|Italian pastry with vanilla|356|6|38|20|
شیرینی ایتالیایی با لیمو|Italian pastry with lemon|364|6|40|20|
شیرینی ایتالیایی با زعفران|Italian pastry with saffron|352|6|37|20|
شیرینی فرانسوی|French pastry|336|5|34|20|
شیرینی فرانسوی با شکلات|French pastry with chocolate|391|6|40|23|
شیرینی فرانسوی با توت‌فرنگی|French pastry with strawberry|356|5|39|20|
شیرینی فرانسوی با پسته|French pastry with pistachio|380|7|34|24|
شیرینی فرانسوی با قهوه|French pastry with coffee cream|357|5|37|21|
شیرینی فرانسوی با کارامل|French pastry with caramel|373|5|41|21|
شیرینی فرانسوی با موز|French pastry with banana|356|5|39|20|
شیرینی فرانسوی با نارگیل|French pastry with coconut|372|5|34|24|
شیرینی فرانسوی با فندق|French pastry with hazelnut|393|6|36|25|
شیرینی فرانسوی با وانیل|French pastry with vanilla|344|5|36|20|
شیرینی فرانسوی با لیمو|French pastry with lemon|352|5|38|20|
شیرینی فرانسوی با زعفران|French pastry with saffron|340|5|35|20|
شیرینی دم‌اسبی|Horsetail cream pastry|336|5|34|20|
شیرینی دم‌اسبی با شکلات|Horsetail cream pastry with chocolate|391|6|40|23|
شیرینی دم‌اسبی با توت‌فرنگی|Horsetail cream pastry with strawberry|356|5|39|20|
شیرینی دم‌اسبی با پسته|Horsetail cream pastry with pistachio|380|7|34|24|
شیرینی دم‌اسبی با قهوه|Horsetail cream pastry with coffee cream|357|5|37|21|
شیرینی دم‌اسبی با کارامل|Horsetail cream pastry with caramel|373|5|41|21|
شیرینی دم‌اسبی با موز|Horsetail cream pastry with banana|356|5|39|20|
شیرینی دم‌اسبی با نارگیل|Horsetail cream pastry with coconut|372|5|34|24|
شیرینی دم‌اسبی با فندق|Horsetail cream pastry with hazelnut|393|6|36|25|
شیرینی دم‌اسبی با وانیل|Horsetail cream pastry with vanilla|344|5|36|20|
شیرینی دم‌اسبی با لیمو|Horsetail cream pastry with lemon|352|5|38|20|
شیرینی دم‌اسبی با زعفران|Horsetail cream pastry with saffron|340|5|35|20|
شیرینی قیفی|Cream horn|346|5|32|22|
شیرینی قیفی با شکلات|Cream horn with chocolate|401|6|38|25|
شیرینی قیفی با توت‌فرنگی|Cream horn with strawberry|366|5|37|22|
شیرینی قیفی با پسته|Cream horn with pistachio|390|7|32|26|
شیرینی قیفی با قهوه|Cream horn with coffee cream|367|5|35|23|
شیرینی قیفی با کارامل|Cream horn with caramel|383|5|39|23|
شیرینی قیفی با موز|Cream horn with banana|366|5|37|22|
شیرینی قیفی با نارگیل|Cream horn with coconut|382|5|32|26|
شیرینی قیفی با فندق|Cream horn with hazelnut|403|6|34|27|
شیرینی قیفی با وانیل|Cream horn with vanilla|354|5|34|22|
شیرینی قیفی با لیمو|Cream horn with lemon|362|5|36|22|
شیرینی قیفی با زعفران|Cream horn with saffron|350|5|33|22|
شیرینی پیراشکی شیرین|Sweet piroshki|310|6|40|14|
شیرینی پیراشکی شیرین با شکلات|Sweet piroshki with chocolate|365|7|46|17|
شیرینی پیراشکی شیرین با توت‌فرنگی|Sweet piroshki with strawberry|330|6|45|14|
شیرینی پیراشکی شیرین با پسته|Sweet piroshki with pistachio|354|8|40|18|
شیرینی پیراشکی شیرین با قهوه|Sweet piroshki with coffee cream|331|6|43|15|
شیرینی پیراشکی شیرین با کارامل|Sweet piroshki with caramel|347|6|47|15|
شیرینی پیراشکی شیرین با موز|Sweet piroshki with banana|330|6|45|14|
شیرینی پیراشکی شیرین با نارگیل|Sweet piroshki with coconut|346|6|40|18|
شیرینی پیراشکی شیرین با فندق|Sweet piroshki with hazelnut|367|7|42|19|
شیرینی پیراشکی شیرین با وانیل|Sweet piroshki with vanilla|318|6|42|14|
شیرینی پیراشکی شیرین با لیمو|Sweet piroshki with lemon|326|6|44|14|
شیرینی پیراشکی شیرین با زعفران|Sweet piroshki with saffron|314|6|41|14|
شیرینی تارت کرم|Cream tartlet|318|5|34|18|
شیرینی تارت کرم با شکلات|Cream tartlet with chocolate|373|6|40|21|
شیرینی تارت کرم با توت‌فرنگی|Cream tartlet with strawberry|338|5|39|18|
شیرینی تارت کرم با پسته|Cream tartlet with pistachio|362|7|34|22|
شیرینی تارت کرم با قهوه|Cream tartlet with coffee cream|339|5|37|19|
شیرینی تارت کرم با کارامل|Cream tartlet with caramel|355|5|41|19|
شیرینی تارت کرم با موز|Cream tartlet with banana|338|5|39|18|
شیرینی تارت کرم با نارگیل|Cream tartlet with coconut|354|5|34|22|
شیرینی تارت کرم با فندق|Cream tartlet with hazelnut|375|6|36|23|
شیرینی تارت کرم با وانیل|Cream tartlet with vanilla|326|5|36|18|
شیرینی تارت کرم با لیمو|Cream tartlet with lemon|334|5|38|18|
شیرینی تارت کرم با زعفران|Cream tartlet with saffron|322|5|35|18|
شیرینی ژاپنی|Japanese cream pastry|304|6|34|16|
شیرینی ژاپنی با شکلات|Japanese cream pastry with chocolate|359|7|40|19|
شیرینی ژاپنی با توت‌فرنگی|Japanese cream pastry with strawberry|324|6|39|16|
شیرینی ژاپنی با پسته|Japanese cream pastry with pistachio|348|8|34|20|
شیرینی ژاپنی با قهوه|Japanese cream pastry with coffee cream|325|6|37|17|
شیرینی ژاپنی با کارامل|Japanese cream pastry with caramel|341|6|41|17|
شیرینی ژاپنی با موز|Japanese cream pastry with banana|324|6|39|16|
شیرینی ژاپنی با نارگیل|Japanese cream pastry with coconut|340|6|34|20|
شیرینی ژاپنی با فندق|Japanese cream pastry with hazelnut|361|7|36|21|
شیرینی ژاپنی با وانیل|Japanese cream pastry with vanilla|312|6|36|16|
شیرینی ژاپنی با لیمو|Japanese cream pastry with lemon|320|6|38|16|
شیرینی ژاپنی با زعفران|Japanese cream pastry with saffron|308|6|35|16|
شیرینی ساندویچی کرم|Cream sandwich pastry|334|5|38|18|
شیرینی ساندویچی کرم با شکلات|Cream sandwich pastry with chocolate|389|6|44|21|
شیرینی ساندویچی کرم با توت‌فرنگی|Cream sandwich pastry with strawberry|354|5|43|18|
شیرینی ساندویچی کرم با پسته|Cream sandwich pastry with pistachio|378|7|38|22|
شیرینی ساندویچی کرم با قهوه|Cream sandwich pastry with coffee cream|355|5|41|19|
شیرینی ساندویچی کرم با کارامل|Cream sandwich pastry with caramel|371|5|45|19|
شیرینی ساندویچی کرم با موز|Cream sandwich pastry with banana|354|5|43|18|
شیرینی ساندویچی کرم با نارگیل|Cream sandwich pastry with coconut|370|5|38|22|
شیرینی ساندویچی کرم با فندق|Cream sandwich pastry with hazelnut|391|6|40|23|
شیرینی ساندویچی کرم با وانیل|Cream sandwich pastry with vanilla|342|5|40|18|
شیرینی ساندویچی کرم با لیمو|Cream sandwich pastry with lemon|350|5|42|18|
شیرینی ساندویچی کرم با زعفران|Cream sandwich pastry with saffron|338|5|39|18|
شیرینی کرم‌دار گردویی|Walnut cream pastry|350|6|32|22|
شیرینی کرم‌دار گردویی با شکلات|Walnut cream pastry with chocolate|405|7|38|25|
شیرینی کرم‌دار گردویی با توت‌فرنگی|Walnut cream pastry with strawberry|370|6|37|22|
شیرینی کرم‌دار گردویی با پسته|Walnut cream pastry with pistachio|394|8|32|26|
شیرینی کرم‌دار گردویی با قهوه|Walnut cream pastry with coffee cream|371|6|35|23|
شیرینی کرم‌دار گردویی با کارامل|Walnut cream pastry with caramel|387|6|39|23|
شیرینی کرم‌دار گردویی با موز|Walnut cream pastry with banana|370|6|37|22|
شیرینی کرم‌دار گردویی با نارگیل|Walnut cream pastry with coconut|386|6|32|26|
شیرینی کرم‌دار گردویی با فندق|Walnut cream pastry with hazelnut|407|7|34|27|
شیرینی کرم‌دار گردویی با وانیل|Walnut cream pastry with vanilla|358|6|34|22|
شیرینی کرم‌دار گردویی با لیمو|Walnut cream pastry with lemon|366|6|36|22|
شیرینی کرم‌دار گردویی با زعفران|Walnut cream pastry with saffron|354|6|33|22|
شیرینی خامه‌ای میوه‌ای|Fruit cream pastry|292|5|32|16|
شیرینی خامه‌ای میوه‌ای با شکلات|Fruit cream pastry with chocolate|347|6|38|19|
شیرینی خامه‌ای میوه‌ای با توت‌فرنگی|Fruit cream pastry with strawberry|312|5|37|16|
شیرینی خامه‌ای میوه‌ای با پسته|Fruit cream pastry with pistachio|336|7|32|20|
شیرینی خامه‌ای میوه‌ای با قهوه|Fruit cream pastry with coffee cream|313|5|35|17|
شیرینی خامه‌ای میوه‌ای با کارامل|Fruit cream pastry with caramel|329|5|39|17|
شیرینی خامه‌ای میوه‌ای با موز|Fruit cream pastry with banana|312|5|37|16|
شیرینی خامه‌ای میوه‌ای با نارگیل|Fruit cream pastry with coconut|328|5|32|20|
شیرینی خامه‌ای میوه‌ای با فندق|Fruit cream pastry with hazelnut|349|6|34|21|
شیرینی خامه‌ای میوه‌ای با وانیل|Fruit cream pastry with vanilla|300|5|34|16|
شیرینی خامه‌ای میوه‌ای با لیمو|Fruit cream pastry with lemon|308|5|36|16|
شیرینی خامه‌ای میوه‌ای با زعفران|Fruit cream pastry with saffron|296|5|33|16|
شیرینی چیزکیکی|Cheesecake pastry|346|7|30|22|
شیرینی چیزکیکی با شکلات|Cheesecake pastry with chocolate|401|8|36|25|
شیرینی چیزکیکی با توت‌فرنگی|Cheesecake pastry with strawberry|366|7|35|22|
شیرینی چیزکیکی با پسته|Cheesecake pastry with pistachio|390|9|30|26|
شیرینی چیزکیکی با قهوه|Cheesecake pastry with coffee cream|367|7|33|23|
شیرینی چیزکیکی با کارامل|Cheesecake pastry with caramel|383|7|37|23|
شیرینی چیزکیکی با موز|Cheesecake pastry with banana|366|7|35|22|
شیرینی چیزکیکی با نارگیل|Cheesecake pastry with coconut|382|7|30|26|
شیرینی چیزکیکی با فندق|Cheesecake pastry with hazelnut|403|8|32|27|
شیرینی چیزکیکی با وانیل|Cheesecake pastry with vanilla|354|7|32|22|
شیرینی چیزکیکی با لیمو|Cheesecake pastry with lemon|362|7|34|22|
شیرینی چیزکیکی با زعفران|Cheesecake pastry with saffron|350|7|31|22|
کیک اسفنجی با فراستینگ کرم پنیر|Sponge cake with cream cheese frosting|442|8|62|18|
کیک اسفنجی با گاناش شکلات|Sponge cake with chocolate ganache|434|8|60|18|
کیک اسفنجی با خامه|Sponge cake with whipped cream|392|7|55|16|
کیک اسفنجی با گلاب|Sponge cake with rosewater|308|7|52|8|
کیک اسفنجی با مغز|Sponge cake with nuts|370|9|52|14|
کیک اسفنجی با رویه کارامل|Sponge cake with caramel topping|375|7|62|11|
کیک اسفنجی کم‌شیرین|Sponge cake reduced sugar|260|7|40|8|
کیک اسفنجی کم‌چرب|Sponge cake low-fat|264|8|58|0|
کیک اسفنجی بدون گلوتن|Sponge cake gluten-free|317|7|52|9|
کیک اسفنجی بدون شکر|Sponge cake sugar-free|240|8|34|8|
کیک اسفنجی با آرد کامل|Sponge cake whole wheat|308|9|50|8|
کیک اسفنجی قنادی|Sponge cake bakery style|347|7|55|11|
کیک اسفنجی برش تکی|Sponge cake single slice|308|7|52|8|
کیک شکلاتی با فراستینگ کرم پنیر|Chocolate cake with cream cheese frosting|516|6|60|28|
کیک شکلاتی با گاناش شکلات|Chocolate cake with chocolate ganache|508|6|58|28|
کیک شکلاتی با خامه|Chocolate cake with whipped cream|466|5|53|26|
کیک شکلاتی با گلاب|Chocolate cake with rosewater|382|5|50|18|
کیک شکلاتی با مغز|Chocolate cake with nuts|444|7|50|24|
کیک شکلاتی با رویه کارامل|Chocolate cake with caramel topping|449|5|60|21|
کیک شکلاتی کم‌شیرین|Chocolate cake reduced sugar|334|5|38|18|
کیک شکلاتی کم‌چرب|Chocolate cake low-fat|338|6|56|10|
کیک شکلاتی بدون گلوتن|Chocolate cake gluten-free|391|5|50|19|
کیک شکلاتی بدون شکر|Chocolate cake sugar-free|314|6|32|18|
کیک شکلاتی با آرد کامل|Chocolate cake whole wheat|382|7|48|18|
کیک شکلاتی خانگی|Chocolate cake homemade|400|5|50|20|
کیک شکلاتی قنادی|Chocolate cake bakery style|421|5|53|21|
کیک شکلاتی برش تکی|Chocolate cake single slice|382|5|50|18|
کیک وانیلی با فراستینگ کرم پنیر|Vanilla cake with cream cheese frosting|506|6|62|26|
کیک وانیلی با گاناش شکلات|Vanilla cake with chocolate ganache|498|6|60|26|
کیک وانیلی با خامه|Vanilla cake with whipped cream|456|5|55|24|
کیک وانیلی با گلاب|Vanilla cake with rosewater|372|5|52|16|
کیک وانیلی با مغز|Vanilla cake with nuts|434|7|52|22|
کیک وانیلی با رویه کارامل|Vanilla cake with caramel topping|439|5|62|19|
کیک وانیلی کم‌شیرین|Vanilla cake reduced sugar|324|5|40|16|
کیک وانیلی کم‌چرب|Vanilla cake low-fat|328|6|58|8|
کیک وانیلی بدون گلوتن|Vanilla cake gluten-free|381|5|52|17|
کیک وانیلی بدون شکر|Vanilla cake sugar-free|304|6|34|16|
کیک وانیلی با آرد کامل|Vanilla cake whole wheat|372|7|50|16|
کیک وانیلی خانگی|Vanilla cake homemade|390|5|52|18|
کیک وانیلی قنادی|Vanilla cake bakery style|411|5|55|19|
کیک وانیلی برش تکی|Vanilla cake single slice|372|5|52|16|
کیک چیزکیک|Cheesecake|352|6|28|24|
کیک چیزکیک با فراستینگ کرم پنیر|Cheesecake with cream cheese frosting|486|7|38|34|
کیک چیزکیک با گاناش شکلات|Cheesecake with chocolate ganache|478|7|36|34|
کیک چیزکیک با خامه|Cheesecake with whipped cream|436|6|31|32|
کیک چیزکیک با گلاب|Cheesecake with rosewater|352|6|28|24|
کیک چیزکیک با مغز|Cheesecake with nuts|414|8|28|30|
کیک چیزکیک با رویه کارامل|Cheesecake with caramel topping|419|6|38|27|
کیک چیزکیک کم‌شیرین|Cheesecake reduced sugar|304|6|16|24|
کیک چیزکیک کم‌چرب|Cheesecake low-fat|308|7|34|16|
کیک چیزکیک بدون گلوتن|Cheesecake gluten-free|361|6|28|25|
کیک چیزکیک بدون شکر|Cheesecake sugar-free|284|7|10|24|
کیک چیزکیک با آرد کامل|Cheesecake whole wheat|352|8|26|24|
کیک چیزکیک خانگی|Cheesecake homemade|370|6|28|26|
کیک چیزکیک قنادی|Cheesecake bakery style|391|6|31|27|
کیک چیزکیک برش تکی|Cheesecake single slice|352|6|28|24|
کیک هویج با فراستینگ کرم پنیر|Carrot cake with cream cheese frosting|530|5|60|30|
کیک هویج با گاناش شکلات|Carrot cake with chocolate ganache|522|5|58|30|
کیک هویج با خامه|Carrot cake with whipped cream|480|4|53|28|
کیک هویج با گلاب|Carrot cake with rosewater|396|4|50|20|
کیک هویج با مغز|Carrot cake with nuts|458|6|50|26|
کیک هویج با رویه کارامل|Carrot cake with caramel topping|463|4|60|23|
کیک هویج کم‌شیرین|Carrot cake reduced sugar|348|4|38|20|
کیک هویج کم‌چرب|Carrot cake low-fat|352|5|56|12|
کیک هویج بدون گلوتن|Carrot cake gluten-free|405|4|50|21|
کیک هویج بدون شکر|Carrot cake sugar-free|328|5|32|20|
کیک هویج با آرد کامل|Carrot cake whole wheat|396|6|48|20|
کیک هویج خانگی|Carrot cake homemade|414|4|50|22|
کیک هویج قنادی|Carrot cake bakery style|435|4|53|23|
کیک هویج برش تکی|Carrot cake single slice|396|4|50|20|
کیک رد ولوت با فراستینگ کرم پنیر|Red velvet cake with cream cheese frosting|522|5|58|30|
کیک رد ولوت با گاناش شکلات|Red velvet cake with chocolate ganache|514|5|56|30|
کیک رد ولوت با خامه|Red velvet cake with whipped cream|472|4|51|28|
کیک رد ولوت با گلاب|Red velvet cake with rosewater|388|4|48|20|
کیک رد ولوت با مغز|Red velvet cake with nuts|450|6|48|26|
کیک رد ولوت با رویه کارامل|Red velvet cake with caramel topping|455|4|58|23|
کیک رد ولوت کم‌شیرین|Red velvet cake reduced sugar|340|4|36|20|
کیک رد ولوت کم‌چرب|Red velvet cake low-fat|344|5|54|12|
کیک رد ولوت بدون گلوتن|Red velvet cake gluten-free|397|4|48|21|
کیک رد ولوت بدون شکر|Red velvet cake sugar-free|320|5|30|20|
کیک رد ولوت با آرد کامل|Red velvet cake whole wheat|388|6|46|20|
کیک رد ولوت خانگی|Red velvet cake homemade|406|4|48|22|
کیک رد ولوت قنادی|Red velvet cake bakery style|427|4|51|23|
کیک رد ولوت برش تکی|Red velvet cake single slice|388|4|48|20|
کیک تیرامیسو با فراستینگ کرم پنیر|Tiramisu cake with cream cheese frosting|442|6|46|26|
کیک تیرامیسو با گاناش شکلات|Tiramisu cake with chocolate ganache|434|6|44|26|
کیک تیرامیسو با خامه|Tiramisu cake with whipped cream|392|5|39|24|
کیک تیرامیسو با گلاب|Tiramisu cake with rosewater|308|5|36|16|
کیک تیرامیسو با مغز|Tiramisu cake with nuts|370|7|36|22|
کیک تیرامیسو با رویه کارامل|Tiramisu cake with caramel topping|375|5|46|19|
کیک تیرامیسو کم‌شیرین|Tiramisu cake reduced sugar|260|5|24|16|
کیک تیرامیسو کم‌چرب|Tiramisu cake low-fat|264|6|42|8|
کیک تیرامیسو بدون گلوتن|Tiramisu cake gluten-free|317|5|36|17|
کیک تیرامیسو بدون شکر|Tiramisu cake sugar-free|240|6|18|16|
کیک تیرامیسو با آرد کامل|Tiramisu cake whole wheat|308|7|34|16|
کیک تیرامیسو خانگی|Tiramisu cake homemade|326|5|36|18|
کیک تیرامیسو قنادی|Tiramisu cake bakery style|347|5|39|19|
کیک تیرامیسو برش تکی|Tiramisu cake single slice|308|5|36|16|
کیک موز با فراستینگ کرم پنیر|Banana cake with cream cheese frosting|484|5|62|24|
کیک موز با گاناش شکلات|Banana cake with chocolate ganache|476|5|60|24|
کیک موز با خامه|Banana cake with whipped cream|434|4|55|22|
کیک موز با گلاب|Banana cake with rosewater|350|4|52|14|
کیک موز با مغز|Banana cake with nuts|412|6|52|20|
کیک موز با رویه کارامل|Banana cake with caramel topping|417|4|62|17|
کیک موز کم‌شیرین|Banana cake reduced sugar|302|4|40|14|
کیک موز کم‌چرب|Banana cake low-fat|306|5|58|6|
کیک موز بدون گلوتن|Banana cake gluten-free|359|4|52|15|
کیک موز بدون شکر|Banana cake sugar-free|282|5|34|14|
کیک موز با آرد کامل|Banana cake whole wheat|350|6|50|14|
کیک موز خانگی|Banana cake homemade|368|4|52|16|
کیک موز قنادی|Banana cake bakery style|389|4|55|17|
کیک موز برش تکی|Banana cake single slice|350|4|52|14|
کیک لیمویی با فراستینگ کرم پنیر|Lemon cake with cream cheese frosting|506|6|62|26|
کیک لیمویی با گاناش شکلات|Lemon cake with chocolate ganache|498|6|60|26|
کیک لیمویی با خامه|Lemon cake with whipped cream|456|5|55|24|
کیک لیمویی با گلاب|Lemon cake with rosewater|372|5|52|16|
کیک لیمویی با مغز|Lemon cake with nuts|434|7|52|22|
کیک لیمویی با رویه کارامل|Lemon cake with caramel topping|439|5|62|19|
کیک لیمویی کم‌شیرین|Lemon cake reduced sugar|324|5|40|16|
کیک لیمویی کم‌چرب|Lemon cake low-fat|328|6|58|8|
کیک لیمویی بدون گلوتن|Lemon cake gluten-free|381|5|52|17|
کیک لیمویی بدون شکر|Lemon cake sugar-free|304|6|34|16|
کیک لیمویی با آرد کامل|Lemon cake whole wheat|372|7|50|16|
کیک لیمویی خانگی|Lemon cake homemade|390|5|52|18|
کیک لیمویی قنادی|Lemon cake bakery style|411|5|55|19|
کیک لیمویی برش تکی|Lemon cake single slice|372|5|52|16|
کیک قهوه با فراستینگ کرم پنیر|Coffee cake with cream cheese frosting|490|6|58|26|
کیک قهوه با گاناش شکلات|Coffee cake with chocolate ganache|482|6|56|26|
کیک قهوه با خامه|Coffee cake with whipped cream|440|5|51|24|
کیک قهوه با گلاب|Coffee cake with rosewater|356|5|48|16|
کیک قهوه با مغز|Coffee cake with nuts|418|7|48|22|
کیک قهوه با رویه کارامل|Coffee cake with caramel topping|423|5|58|19|
کیک قهوه کم‌شیرین|Coffee cake reduced sugar|308|5|36|16|
کیک قهوه کم‌چرب|Coffee cake low-fat|312|6|54|8|
کیک قهوه بدون گلوتن|Coffee cake gluten-free|365|5|48|17|
کیک قهوه بدون شکر|Coffee cake sugar-free|288|6|30|16|
کیک قهوه با آرد کامل|Coffee cake whole wheat|356|7|46|16|
کیک قهوه خانگی|Coffee cake homemade|374|5|48|18|
کیک قهوه قنادی|Coffee cake bakery style|395|5|51|19|
کیک قهوه برش تکی|Coffee cake single slice|356|5|48|16|
کیک پوندی|Pound cake|408|5|52|20|
کیک پوندی با فراستینگ کرم پنیر|Pound cake with cream cheese frosting|542|6|62|30|
کیک پوندی با گاناش شکلات|Pound cake with chocolate ganache|534|6|60|30|
کیک پوندی با خامه|Pound cake with whipped cream|492|5|55|28|
کیک پوندی با گلاب|Pound cake with rosewater|408|5|52|20|
کیک پوندی با مغز|Pound cake with nuts|470|7|52|26|
کیک پوندی با رویه کارامل|Pound cake with caramel topping|475|5|62|23|
کیک پوندی کم‌شیرین|Pound cake reduced sugar|360|5|40|20|
کیک پوندی کم‌چرب|Pound cake low-fat|364|6|58|12|
کیک پوندی بدون گلوتن|Pound cake gluten-free|417|5|52|21|
کیک پوندی بدون شکر|Pound cake sugar-free|340|6|34|20|
کیک پوندی با آرد کامل|Pound cake whole wheat|408|7|50|20|
کیک پوندی خانگی|Pound cake homemade|426|5|52|22|
کیک پوندی قنادی|Pound cake bakery style|447|5|55|23|
کیک پوندی برش تکی|Pound cake single slice|408|5|52|20|
کیک مارمر با فراستینگ کرم پنیر|Marble cake with cream cheese frosting|515|6|62|27|
کیک مارمر با گاناش شکلات|Marble cake with chocolate ganache|507|6|60|27|
کیک مارمر با خامه|Marble cake with whipped cream|465|5|55|25|
کیک مارمر با گلاب|Marble cake with rosewater|381|5|52|17|
کیک مارمر با مغز|Marble cake with nuts|443|7|52|23|
کیک مارمر با رویه کارامل|Marble cake with caramel topping|448|5|62|20|
کیک مارمر کم‌شیرین|Marble cake reduced sugar|333|5|40|17|
کیک مارمر کم‌چرب|Marble cake low-fat|337|6|58|9|
کیک مارمر بدون گلوتن|Marble cake gluten-free|390|5|52|18|
کیک مارمر بدون شکر|Marble cake sugar-free|313|6|34|17|
کیک مارمر با آرد کامل|Marble cake whole wheat|381|7|50|17|
کیک مارمر خانگی|Marble cake homemade|399|5|52|19|
کیک مارمر قنادی|Marble cake bakery style|420|5|55|20|
کیک مارمر برش تکی|Marble cake single slice|381|5|52|17|
کیک ماست با فراستینگ کرم پنیر|Yogurt cake with cream cheese frosting|484|7|60|24|
کیک ماست با گاناش شکلات|Yogurt cake with chocolate ganache|476|7|58|24|
کیک ماست با خامه|Yogurt cake with whipped cream|434|6|53|22|
کیک ماست با گلاب|Yogurt cake with rosewater|350|6|50|14|
کیک ماست با مغز|Yogurt cake with nuts|412|8|50|20|
کیک ماست با رویه کارامل|Yogurt cake with caramel topping|417|6|60|17|
کیک ماست کم‌شیرین|Yogurt cake reduced sugar|302|6|38|14|
کیک ماست کم‌چرب|Yogurt cake low-fat|306|7|56|6|
کیک ماست بدون گلوتن|Yogurt cake gluten-free|359|6|50|15|
کیک ماست بدون شکر|Yogurt cake sugar-free|282|7|32|14|
کیک ماست با آرد کامل|Yogurt cake whole wheat|350|8|48|14|
کیک ماست خانگی|Yogurt cake homemade|368|6|50|16|
کیک ماست قنادی|Yogurt cake bakery style|389|6|53|17|
کیک ماست برش تکی|Yogurt cake single slice|350|6|50|14|
کیک روغنی با فراستینگ کرم پنیر|Oil cake with cream cheese frosting|524|6|62|28|
کیک روغنی با گاناش شکلات|Oil cake with chocolate ganache|516|6|60|28|
کیک روغنی با خامه|Oil cake with whipped cream|474|5|55|26|
کیک روغنی با گلاب|Oil cake with rosewater|390|5|52|18|
کیک روغنی با مغز|Oil cake with nuts|452|7|52|24|
کیک روغنی با رویه کارامل|Oil cake with caramel topping|457|5|62|21|
کیک روغنی کم‌شیرین|Oil cake reduced sugar|342|5|40|18|
کیک روغنی کم‌چرب|Oil cake low-fat|346|6|58|10|
کیک روغنی بدون گلوتن|Oil cake gluten-free|399|5|52|19|
کیک روغنی بدون شکر|Oil cake sugar-free|322|6|34|18|
کیک روغنی با آرد کامل|Oil cake whole wheat|390|7|50|18|
کیک روغنی خانگی|Oil cake homemade|408|5|52|20|
کیک روغنی قنادی|Oil cake bakery style|429|5|55|21|
کیک روغنی برش تکی|Oil cake single slice|390|5|52|18|
کیک خامه‌ای با فراستینگ کرم پنیر|Cream cake with cream cheese frosting|486|6|48|30|
کیک خامه‌ای با گاناش شکلات|Cream cake with chocolate ganache|478|6|46|30|
کیک خامه‌ای با خامه|Cream cake with whipped cream|436|5|41|28|
کیک خامه‌ای با گلاب|Cream cake with rosewater|352|5|38|20|
کیک خامه‌ای با مغز|Cream cake with nuts|414|7|38|26|
کیک خامه‌ای با رویه کارامل|Cream cake with caramel topping|419|5|48|23|
کیک خامه‌ای کم‌شیرین|Cream cake reduced sugar|304|5|26|20|
کیک خامه‌ای کم‌چرب|Cream cake low-fat|308|6|44|12|
کیک خامه‌ای بدون گلوتن|Cream cake gluten-free|361|5|38|21|
کیک خامه‌ای بدون شکر|Cream cake sugar-free|284|6|20|20|
کیک خامه‌ای با آرد کامل|Cream cake whole wheat|352|7|36|20|
کیک خامه‌ای خانگی|Cream cake homemade|370|5|38|22|
کیک خامه‌ای قنادی|Cream cake bakery style|391|5|41|23|
کیک خامه‌ای برش تکی|Cream cake single slice|352|5|38|20|
کیک میوه‌ای|Fruit cake|366|4|56|14|
کیک میوه‌ای با فراستینگ کرم پنیر|Fruit cake with cream cheese frosting|500|5|66|24|
کیک میوه‌ای با گاناش شکلات|Fruit cake with chocolate ganache|492|5|64|24|
کیک میوه‌ای با خامه|Fruit cake with whipped cream|450|4|59|22|
کیک میوه‌ای با گلاب|Fruit cake with rosewater|366|4|56|14|
کیک میوه‌ای با مغز|Fruit cake with nuts|428|6|56|20|
کیک میوه‌ای با رویه کارامل|Fruit cake with caramel topping|433|4|66|17|
کیک میوه‌ای کم‌شیرین|Fruit cake reduced sugar|318|4|44|14|
کیک میوه‌ای کم‌چرب|Fruit cake low-fat|322|5|62|6|
کیک میوه‌ای بدون گلوتن|Fruit cake gluten-free|375|4|56|15|
کیک میوه‌ای بدون شکر|Fruit cake sugar-free|298|5|38|14|
کیک میوه‌ای با آرد کامل|Fruit cake whole wheat|366|6|54|14|
کیک میوه‌ای خانگی|Fruit cake homemade|384|4|56|16|
کیک میوه‌ای قنادی|Fruit cake bakery style|405|4|59|17|
کیک میوه‌ای برش تکی|Fruit cake single slice|366|4|56|14|
کیک بلوبری|Blueberry cake|360|4|50|16|
کیک بلوبری با فراستینگ کرم پنیر|Blueberry cake with cream cheese frosting|494|5|60|26|
کیک بلوبری با گاناش شکلات|Blueberry cake with chocolate ganache|486|5|58|26|
کیک بلوبری با خامه|Blueberry cake with whipped cream|444|4|53|24|
کیک بلوبری با گلاب|Blueberry cake with rosewater|360|4|50|16|
کیک بلوبری با مغز|Blueberry cake with nuts|422|6|50|22|
کیک بلوبری با رویه کارامل|Blueberry cake with caramel topping|427|4|60|19|
کیک بلوبری کم‌شیرین|Blueberry cake reduced sugar|312|4|38|16|
کیک بلوبری کم‌چرب|Blueberry cake low-fat|316|5|56|8|
کیک بلوبری بدون گلوتن|Blueberry cake gluten-free|369|4|50|17|
کیک بلوبری بدون شکر|Blueberry cake sugar-free|292|5|32|16|
کیک بلوبری با آرد کامل|Blueberry cake whole wheat|360|6|48|16|
کیک بلوبری خانگی|Blueberry cake homemade|378|4|50|18|
کیک بلوبری قنادی|Blueberry cake bakery style|399|4|53|19|
کیک بلوبری برش تکی|Blueberry cake single slice|360|4|50|16|
کیک سیب|Apple cake|334|4|48|14|
کیک سیب با فراستینگ کرم پنیر|Apple cake with cream cheese frosting|468|5|58|24|
کیک سیب با گاناش شکلات|Apple cake with chocolate ganache|460|5|56|24|
کیک سیب با خامه|Apple cake with whipped cream|418|4|51|22|
کیک سیب با گلاب|Apple cake with rosewater|334|4|48|14|
کیک سیب با مغز|Apple cake with nuts|396|6|48|20|
کیک سیب با رویه کارامل|Apple cake with caramel topping|401|4|58|17|
کیک سیب کم‌شیرین|Apple cake reduced sugar|286|4|36|14|
کیک سیب کم‌چرب|Apple cake low-fat|290|5|54|6|
کیک سیب بدون گلوتن|Apple cake gluten-free|343|4|48|15|
کیک سیب بدون شکر|Apple cake sugar-free|266|5|30|14|
کیک سیب با آرد کامل|Apple cake whole wheat|334|6|46|14|
کیک سیب خانگی|Apple cake homemade|352|4|48|16|
کیک سیب قنادی|Apple cake bakery style|373|4|51|17|
کیک سیب برش تکی|Apple cake single slice|334|4|48|14|
کیک گردو|Walnut cake|416|6|44|24|
کیک گردو با فراستینگ کرم پنیر|Walnut cake with cream cheese frosting|550|7|54|34|
کیک گردو با گاناش شکلات|Walnut cake with chocolate ganache|542|7|52|34|
کیک گردو با خامه|Walnut cake with whipped cream|500|6|47|32|
کیک گردو با گلاب|Walnut cake with rosewater|416|6|44|24|
کیک گردو با مغز|Walnut cake with nuts|478|8|44|30|
کیک گردو با رویه کارامل|Walnut cake with caramel topping|483|6|54|27|
کیک گردو کم‌شیرین|Walnut cake reduced sugar|368|6|32|24|
کیک گردو کم‌چرب|Walnut cake low-fat|372|7|50|16|
کیک گردو بدون گلوتن|Walnut cake gluten-free|425|6|44|25|
کیک گردو بدون شکر|Walnut cake sugar-free|348|7|26|24|
کیک گردو با آرد کامل|Walnut cake whole wheat|416|8|42|24|
کیک گردو خانگی|Walnut cake homemade|434|6|44|26|
کیک گردو قنادی|Walnut cake bakery style|455|6|47|27|
کیک گردو برش تکی|Walnut cake single slice|416|6|44|24|
کیک بادام با فراستینگ کرم پنیر|Almond cake with cream cheese frosting|554|8|54|34|
کیک بادام با گاناش شکلات|Almond cake with chocolate ganache|546|8|52|34|
کیک بادام با خامه|Almond cake with whipped cream|504|7|47|32|
کیک بادام با گلاب|Almond cake with rosewater|420|7|44|24|
کیک بادام با مغز|Almond cake with nuts|482|9|44|30|
کیک بادام با رویه کارامل|Almond cake with caramel topping|487|7|54|27|
کیک بادام کم‌شیرین|Almond cake reduced sugar|372|7|32|24|
کیک بادام کم‌چرب|Almond cake low-fat|376|8|50|16|
کیک بادام بدون گلوتن|Almond cake gluten-free|429|7|44|25|
کیک بادام بدون شکر|Almond cake sugar-free|352|8|26|24|
کیک بادام با آرد کامل|Almond cake whole wheat|420|9|42|24|
کیک بادام خانگی|Almond cake homemade|438|7|44|26|
کیک بادام قنادی|Almond cake bakery style|459|7|47|27|
کیک بادام برش تکی|Almond cake single slice|420|7|44|24|
کیک نارگیلی با فراستینگ کرم پنیر|Coconut cake with cream cheese frosting|540|5|58|32|
کیک نارگیلی با گاناش شکلات|Coconut cake with chocolate ganache|532|5|56|32|
کیک نارگیلی با خامه|Coconut cake with whipped cream|490|4|51|30|
کیک نارگیلی با گلاب|Coconut cake with rosewater|406|4|48|22|
کیک نارگیلی با مغز|Coconut cake with nuts|468|6|48|28|
کیک نارگیلی با رویه کارامل|Coconut cake with caramel topping|473|4|58|25|
کیک نارگیلی کم‌شیرین|Coconut cake reduced sugar|358|4|36|22|
کیک نارگیلی کم‌چرب|Coconut cake low-fat|362|5|54|14|
کیک نارگیلی بدون گلوتن|Coconut cake gluten-free|415|4|48|23|
کیک نارگیلی بدون شکر|Coconut cake sugar-free|338|5|30|22|
کیک نارگیلی با آرد کامل|Coconut cake whole wheat|406|6|46|22|
کیک نارگیلی خانگی|Coconut cake homemade|424|4|48|24|
کیک نارگیلی قنادی|Coconut cake bakery style|445|4|51|25|
کیک نارگیلی برش تکی|Coconut cake single slice|406|4|48|22|
کیک پرتقالی با فراستینگ کرم پنیر|Orange cake with cream cheese frosting|497|6|62|25|
کیک پرتقالی با گاناش شکلات|Orange cake with chocolate ganache|489|6|60|25|
کیک پرتقالی با خامه|Orange cake with whipped cream|447|5|55|23|
کیک پرتقالی با گلاب|Orange cake with rosewater|363|5|52|15|
کیک پرتقالی با مغز|Orange cake with nuts|425|7|52|21|
کیک پرتقالی با رویه کارامل|Orange cake with caramel topping|430|5|62|18|
کیک پرتقالی کم‌شیرین|Orange cake reduced sugar|315|5|40|15|
کیک پرتقالی کم‌چرب|Orange cake low-fat|319|6|58|7|
کیک پرتقالی بدون گلوتن|Orange cake gluten-free|372|5|52|16|
کیک پرتقالی بدون شکر|Orange cake sugar-free|295|6|34|15|
کیک پرتقالی با آرد کامل|Orange cake whole wheat|363|7|50|15|
کیک پرتقالی خانگی|Orange cake homemade|381|5|52|17|
کیک پرتقالی قنادی|Orange cake bakery style|402|5|55|18|
کیک پرتقالی برش تکی|Orange cake single slice|363|5|52|15|
کیک خرما|Date cake|366|4|56|14|
کیک خرما با فراستینگ کرم پنیر|Date cake with cream cheese frosting|500|5|66|24|
کیک خرما با گاناش شکلات|Date cake with chocolate ganache|492|5|64|24|
کیک خرما با خامه|Date cake with whipped cream|450|4|59|22|
کیک خرما با گلاب|Date cake with rosewater|366|4|56|14|
کیک خرما با مغز|Date cake with nuts|428|6|56|20|
کیک خرما با رویه کارامل|Date cake with caramel topping|433|4|66|17|
کیک خرما کم‌شیرین|Date cake reduced sugar|318|4|44|14|
کیک خرما کم‌چرب|Date cake low-fat|322|5|62|6|
کیک خرما بدون گلوتن|Date cake gluten-free|375|4|56|15|
کیک خرما بدون شکر|Date cake sugar-free|298|5|38|14|
کیک خرما با آرد کامل|Date cake whole wheat|366|6|54|14|
کیک خرما خانگی|Date cake homemade|384|4|56|16|
کیک خرما قنادی|Date cake bakery style|405|4|59|17|
کیک خرما برش تکی|Date cake single slice|366|4|56|14|
کیک کدو حلوایی|Pumpkin cake|352|4|48|16|
کیک کدو حلوایی با فراستینگ کرم پنیر|Pumpkin cake with cream cheese frosting|486|5|58|26|
کیک کدو حلوایی با گاناش شکلات|Pumpkin cake with chocolate ganache|478|5|56|26|
کیک کدو حلوایی با خامه|Pumpkin cake with whipped cream|436|4|51|24|
کیک کدو حلوایی با گلاب|Pumpkin cake with rosewater|352|4|48|16|
کیک کدو حلوایی با مغز|Pumpkin cake with nuts|414|6|48|22|
کیک کدو حلوایی با رویه کارامل|Pumpkin cake with caramel topping|419|4|58|19|
کیک کدو حلوایی کم‌شیرین|Pumpkin cake reduced sugar|304|4|36|16|
کیک کدو حلوایی کم‌چرب|Pumpkin cake low-fat|308|5|54|8|
کیک کدو حلوایی بدون گلوتن|Pumpkin cake gluten-free|361|4|48|17|
کیک کدو حلوایی بدون شکر|Pumpkin cake sugar-free|284|5|30|16|
کیک کدو حلوایی با آرد کامل|Pumpkin cake whole wheat|352|6|46|16|
کیک کدو حلوایی خانگی|Pumpkin cake homemade|370|4|48|18|
کیک کدو حلوایی قنادی|Pumpkin cake bakery style|391|4|51|19|
کیک کدو حلوایی برش تکی|Pumpkin cake single slice|352|4|48|16|
کیک دارچینی|Cinnamon cake|372|5|52|16|
کیک دارچینی با فراستینگ کرم پنیر|Cinnamon cake with cream cheese frosting|506|6|62|26|
کیک دارچینی با گاناش شکلات|Cinnamon cake with chocolate ganache|498|6|60|26|
کیک دارچینی با خامه|Cinnamon cake with whipped cream|456|5|55|24|
کیک دارچینی با گلاب|Cinnamon cake with rosewater|372|5|52|16|
کیک دارچینی با مغز|Cinnamon cake with nuts|434|7|52|22|
کیک دارچینی با رویه کارامل|Cinnamon cake with caramel topping|439|5|62|19|
کیک دارچینی کم‌شیرین|Cinnamon cake reduced sugar|324|5|40|16|
کیک دارچینی کم‌چرب|Cinnamon cake low-fat|328|6|58|8|
کیک دارچینی بدون گلوتن|Cinnamon cake gluten-free|381|5|52|17|
کیک دارچینی بدون شکر|Cinnamon cake sugar-free|304|6|34|16|
کیک دارچینی با آرد کامل|Cinnamon cake whole wheat|372|7|50|16|
کیک دارچینی خانگی|Cinnamon cake homemade|390|5|52|18|
کیک دارچینی قنادی|Cinnamon cake bakery style|411|5|55|19|
کیک دارچینی برش تکی|Cinnamon cake single slice|372|5|52|16|
کیک زنجبیلی|Ginger cake|366|4|56|14|
کیک زنجبیلی با فراستینگ کرم پنیر|Ginger cake with cream cheese frosting|500|5|66|24|
کیک زنجبیلی با گاناش شکلات|Ginger cake with chocolate ganache|492|5|64|24|
کیک زنجبیلی با خامه|Ginger cake with whipped cream|450|4|59|22|
کیک زنجبیلی با گلاب|Ginger cake with rosewater|366|4|56|14|
کیک زنجبیلی با مغز|Ginger cake with nuts|428|6|56|20|
کیک زنجبیلی با رویه کارامل|Ginger cake with caramel topping|433|4|66|17|
کیک زنجبیلی کم‌شیرین|Ginger cake reduced sugar|318|4|44|14|
کیک زنجبیلی کم‌چرب|Ginger cake low-fat|322|5|62|6|
کیک زنجبیلی بدون گلوتن|Ginger cake gluten-free|375|4|56|15|
کیک زنجبیلی بدون شکر|Ginger cake sugar-free|298|5|38|14|
کیک زنجبیلی با آرد کامل|Ginger cake whole wheat|366|6|54|14|
کیک زنجبیلی خانگی|Ginger cake homemade|384|4|56|16|
کیک زنجبیلی قنادی|Ginger cake bakery style|405|4|59|17|
کیک زنجبیلی برش تکی|Ginger cake single slice|366|4|56|14|
کیک اپرا|Opera cake|398|6|44|22|
کیک شوارتزوالد|Black forest cake|334|5|38|18|
کیک زاخر|Sachertorte|392|5|48|20|
کیک پاندیسپانی|Pan di Spagna|306|7|56|6|
کیک بابا|Baba cake|328|5|50|12|
کیک بروانی|Brownie cake|410|5|48|22|
کیک لاوا شکلاتی|Chocolate lava cake|400|6|40|24|
کیک فوندانت|Fondant cake|366|3|66|10|
کیک سوئیسی|Swiss roll|342|6|48|14|
کیک رولی شکلاتی|Chocolate roll cake|370|6|46|18|
کیک رولی خامه‌ای|Cream roll cake|332|5|42|16|
کیک توت‌فرنگی|Strawberry shortcake|302|4|40|14|
کیک ژله‌ای|Jelly cake|232|4|36|8|
کیک ایرانی|Iranian cake|390|5|52|18|
کیک اسفنجی خامه‌ای میوه|Fruit cream sponge cake|288|5|40|12|
کیک شکلاتی دو لایه|Double layer chocolate cake|391|5|50|19|
کیک پنیری نیویورکی|New York cheesecake|353|6|26|25|
کیک پنیری توت‌فرنگی|Strawberry cheesecake|320|5|30|20|
کیک پنیری شکلاتی|Chocolate cheesecake|360|6|30|24|
کیک پنیری لوتوس|Lotus cheesecake|372|5|34|24|
کیک پنیری پسته|Pistachio cheesecake|374|7|28|26|
کیک پنیری بلوبری|Blueberry cheesecake|320|5|30|20|
کیک پنیری لیمو|Lemon cheesecake|334|6|28|22|
کیک پنیری ژاپنی|Japanese cheesecake|224|7|22|12|
کیک پنیری باسکی|Basque cheesecake|328|8|20|24|
کیک پنیری کارامل|Caramel cheesecake|350|6|32|22|
کیک پنیری نوتلا|Nutella cheesecake|386|6|32|26|
کیک پنیری انبه|Mango cheesecake|320|5|30|20|
کیک پنیری بدون پخت|No-bake cheesecake|338|5|30|22|
کیک پنیری اوریو|Oreo cheesecake|372|5|34|24|
کیک پنیری وانیلی|Vanilla cheesecake|344|6|26|24|
کیک پنیری قهوه|Coffee cheesecake|334|6|28|22|
کیک پنیری شکلات سفید|White chocolate cheesecake|378|6|30|26|
کیک پنیری آلبالو|Sour cherry cheesecake|328|5|32|20|
کیک پنیری هلو|Peach cheesecake|320|5|30|20|
کیک پنیری رز|Rose cheesecake|338|5|30|22|
کیک پنیری ماست|Yogurt cheesecake|268|7|24|16|
کیک پنیری کم‌چرب|Light cheesecake|226|8|26|10|
کیک پنیری زعفرانی|Saffron cheesecake|334|6|28|22|
تیرامیسو|Tiramisu|301|5|32|17|
تیرامیسو لیوانی|Tiramisu cup|292|5|32|16|
تیرامیسو توت‌فرنگی|Strawberry tiramisu|279|4|32|15|
تیرامیسو شکلاتی|Chocolate tiramisu|309|5|34|17|
تیرامیسو پسته‌ای|Pistachio tiramisu|314|6|32|18|
تیرامیسو لوتوس|Lotus tiramisu|317|5|36|17|
تیرامیسو بدون الکل|Alcohol-free tiramisu|292|5|32|16|
تیرامیسو کم‌چرب|Light tiramisu|216|6|30|8|
تیرامیسو نوتلا|Nutella tiramisu|344|5|36|20|
تیرامیسو موز|Banana tiramisu|287|4|34|15|
کوکی شکلات‌چیپ|Chocolate chip cookie|483|5|64|23|
کوکی شکلات‌چیپ نرم|Chocolate chip cookie soft|489|5|61|25|
کوکی شکلات‌چیپ ترد|Chocolate chip cookie crispy|471|6|69|19|
کوکی شکلات‌چیپ خانگی|Chocolate chip cookie homemade|492|5|64|24|
کوکی شکلات‌چیپ بدون شکر|Chocolate chip cookie sugar-free|423|6|48|23|
کوکی شکلات‌چیپ بدون گلوتن|Chocolate chip cookie gluten-free|492|5|64|24|
کوکی شکلات‌چیپ ورزشی|Chocolate chip cookie fitness|440|9|56|20|
کوکی شکلات‌چیپ بسته‌بندی|Chocolate chip cookie packaged|481|5|68|21|
کوکی کره‌ای|Butter cookie|488|6|62|24|
کوکی کره‌ای نرم|Butter cookie soft|494|6|59|26|
کوکی کره‌ای ترد|Butter cookie crispy|476|7|67|20|
کوکی کره‌ای خانگی|Butter cookie homemade|497|6|62|25|
کوکی کره‌ای بدون شکر|Butter cookie sugar-free|428|7|46|24|
کوکی کره‌ای بدون گلوتن|Butter cookie gluten-free|497|6|62|25|
کوکی کره‌ای ورزشی|Butter cookie fitness|445|10|54|21|
کوکی کره‌ای بسته‌بندی|Butter cookie packaged|486|6|66|22|
کوکی شکلاتی نرم|Double chocolate cookie soft|486|6|57|26|
کوکی شکلاتی ترد|Double chocolate cookie crispy|468|7|65|20|
کوکی شکلاتی خانگی|Double chocolate cookie homemade|489|6|60|25|
کوکی شکلاتی بدون شکر|Double chocolate cookie sugar-free|420|7|44|24|
کوکی شکلاتی بدون گلوتن|Double chocolate cookie gluten-free|489|6|60|25|
کوکی شکلاتی ورزشی|Double chocolate cookie fitness|437|10|52|21|
کوکی شکلاتی بسته‌بندی|Double chocolate cookie packaged|478|6|64|22|
کوکی جو دوسر و کشمش|Oatmeal raisin cookie|450|6|66|18|
کوکی جو دوسر و کشمش نرم|Oatmeal raisin cookie soft|456|6|63|20|
کوکی جو دوسر و کشمش ترد|Oatmeal raisin cookie crispy|438|7|71|14|
کوکی جو دوسر و کشمش خانگی|Oatmeal raisin cookie homemade|459|6|66|19|
کوکی جو دوسر و کشمش بدون شکر|Oatmeal raisin cookie sugar-free|390|7|50|18|
کوکی جو دوسر و کشمش بدون گلوتن|Oatmeal raisin cookie gluten-free|459|6|66|19|
کوکی جو دوسر و کشمش ورزشی|Oatmeal raisin cookie fitness|407|10|58|15|
کوکی جو دوسر و کشمش بسته‌بندی|Oatmeal raisin cookie packaged|448|6|70|16|
کوکی کره بادام‌زمینی|Peanut butter cookie|494|9|56|26|
کوکی کره بادام‌زمینی نرم|Peanut butter cookie soft|500|9|53|28|
کوکی کره بادام‌زمینی ترد|Peanut butter cookie crispy|482|10|61|22|
کوکی کره بادام‌زمینی خانگی|Peanut butter cookie homemade|503|9|56|27|
کوکی کره بادام‌زمینی بدون شکر|Peanut butter cookie sugar-free|434|10|40|26|
کوکی کره بادام‌زمینی بدون گلوتن|Peanut butter cookie gluten-free|503|9|56|27|
کوکی کره بادام‌زمینی ورزشی|Peanut butter cookie fitness|451|13|48|23|
کوکی کره بادام‌زمینی بسته‌بندی|Peanut butter cookie packaged|492|9|60|24|
کوکی نارگیلی|Coconut cookie|484|5|62|24|
کوکی نارگیلی نرم|Coconut cookie soft|490|5|59|26|
کوکی نارگیلی ترد|Coconut cookie crispy|472|6|67|20|
کوکی نارگیلی خانگی|Coconut cookie homemade|493|5|62|25|
کوکی نارگیلی بدون شکر|Coconut cookie sugar-free|424|6|46|24|
کوکی نارگیلی بدون گلوتن|Coconut cookie gluten-free|493|5|62|25|
کوکی نارگیلی ورزشی|Coconut cookie fitness|441|9|54|21|
کوکی نارگیلی بسته‌بندی|Coconut cookie packaged|482|5|66|22|
کوکی زنجبیلی|Gingerbread cookie|424|5|74|12|
کوکی زنجبیلی نرم|Gingerbread cookie soft|430|5|71|14|
کوکی زنجبیلی ترد|Gingerbread cookie crispy|412|6|79|8|
کوکی زنجبیلی خانگی|Gingerbread cookie homemade|433|5|74|13|
کوکی زنجبیلی بدون شکر|Gingerbread cookie sugar-free|364|6|58|12|
کوکی زنجبیلی بدون گلوتن|Gingerbread cookie gluten-free|433|5|74|13|
کوکی زنجبیلی ورزشی|Gingerbread cookie fitness|381|9|66|9|
کوکی زنجبیلی بسته‌بندی|Gingerbread cookie packaged|422|5|78|10|
کوکی ساده|Plain cookie|478|6|64|22|
کوکی ساده نرم|Plain cookie soft|484|6|61|24|
کوکی ساده ترد|Plain cookie crispy|466|7|69|18|
کوکی ساده خانگی|Plain cookie homemade|487|6|64|23|
کوکی ساده بدون شکر|Plain cookie sugar-free|418|7|48|22|
کوکی ساده بدون گلوتن|Plain cookie gluten-free|487|6|64|23|
کوکی ساده ورزشی|Plain cookie fitness|435|10|56|19|
کوکی ساده بسته‌بندی|Plain cookie packaged|476|6|68|20|
کوکی بادام|Almond cookie|490|8|56|26|
کوکی بادام نرم|Almond cookie soft|496|8|53|28|
کوکی بادام ترد|Almond cookie crispy|478|9|61|22|
کوکی بادام خانگی|Almond cookie homemade|499|8|56|27|
کوکی بادام بدون شکر|Almond cookie sugar-free|430|9|40|26|
کوکی بادام بدون گلوتن|Almond cookie gluten-free|499|8|56|27|
کوکی بادام ورزشی|Almond cookie fitness|447|12|48|23|
کوکی بادام بسته‌بندی|Almond cookie packaged|488|8|60|24|
کوکی گردو|Walnut cookie|494|7|58|26|
کوکی گردو نرم|Walnut cookie soft|500|7|55|28|
کوکی گردو ترد|Walnut cookie crispy|482|8|63|22|
کوکی گردو خانگی|Walnut cookie homemade|503|7|58|27|
کوکی گردو بدون شکر|Walnut cookie sugar-free|434|8|42|26|
کوکی گردو بدون گلوتن|Walnut cookie gluten-free|503|7|58|27|
کوکی گردو ورزشی|Walnut cookie fitness|451|11|50|23|
کوکی گردو بسته‌بندی|Walnut cookie packaged|492|7|62|24|
کوکی دارچین|Cinnamon cookie|478|6|64|22|
کوکی دارچین نرم|Cinnamon cookie soft|484|6|61|24|
کوکی دارچین ترد|Cinnamon cookie crispy|466|7|69|18|
کوکی دارچین خانگی|Cinnamon cookie homemade|487|6|64|23|
کوکی دارچین بدون شکر|Cinnamon cookie sugar-free|418|7|48|22|
کوکی دارچین بدون گلوتن|Cinnamon cookie gluten-free|487|6|64|23|
کوکی دارچین ورزشی|Cinnamon cookie fitness|435|10|56|19|
کوکی دارچین بسته‌بندی|Cinnamon cookie packaged|476|6|68|20|
کوکی لیمو|Lemon cookie|464|5|66|20|
کوکی لیمو نرم|Lemon cookie soft|470|5|63|22|
کوکی لیمو ترد|Lemon cookie crispy|452|6|71|16|
کوکی لیمو خانگی|Lemon cookie homemade|473|5|66|21|
کوکی لیمو بدون شکر|Lemon cookie sugar-free|404|6|50|20|
کوکی لیمو بدون گلوتن|Lemon cookie gluten-free|473|5|66|21|
کوکی لیمو ورزشی|Lemon cookie fitness|421|9|58|17|
کوکی لیمو بسته‌بندی|Lemon cookie packaged|462|5|70|18|
کوکی پسته|Pistachio cookie|490|8|56|26|
کوکی پسته نرم|Pistachio cookie soft|496|8|53|28|
کوکی پسته ترد|Pistachio cookie crispy|478|9|61|22|
کوکی پسته خانگی|Pistachio cookie homemade|499|8|56|27|
کوکی پسته بدون شکر|Pistachio cookie sugar-free|430|9|40|26|
کوکی پسته بدون گلوتن|Pistachio cookie gluten-free|499|8|56|27|
کوکی پسته ورزشی|Pistachio cookie fitness|447|12|48|23|
کوکی پسته بسته‌بندی|Pistachio cookie packaged|488|8|60|24|
کوکی شکلات سفید|White chocolate cookie|482|5|66|22|
کوکی شکلات سفید نرم|White chocolate cookie soft|488|5|63|24|
کوکی شکلات سفید ترد|White chocolate cookie crispy|470|6|71|18|
کوکی شکلات سفید خانگی|White chocolate cookie homemade|491|5|66|23|
کوکی شکلات سفید بدون شکر|White chocolate cookie sugar-free|422|6|50|22|
کوکی شکلات سفید بدون گلوتن|White chocolate cookie gluten-free|491|5|66|23|
کوکی شکلات سفید ورزشی|White chocolate cookie fitness|439|9|58|19|
کوکی شکلات سفید بسته‌بندی|White chocolate cookie packaged|480|5|70|20|
کوکی فندقی|Hazelnut cookie|494|7|58|26|
کوکی فندقی نرم|Hazelnut cookie soft|500|7|55|28|
کوکی فندقی ترد|Hazelnut cookie crispy|482|8|63|22|
کوکی فندقی خانگی|Hazelnut cookie homemade|503|7|58|27|
کوکی فندقی بدون شکر|Hazelnut cookie sugar-free|434|8|42|26|
کوکی فندقی بدون گلوتن|Hazelnut cookie gluten-free|503|7|58|27|
کوکی فندقی ورزشی|Hazelnut cookie fitness|451|11|50|23|
کوکی فندقی بسته‌بندی|Hazelnut cookie packaged|492|7|62|24|
کوکی کاراملی|Caramel cookie|464|5|66|20|
کوکی کاراملی نرم|Caramel cookie soft|470|5|63|22|
کوکی کاراملی ترد|Caramel cookie crispy|452|6|71|16|
کوکی کاراملی خانگی|Caramel cookie homemade|473|5|66|21|
کوکی کاراملی بدون شکر|Caramel cookie sugar-free|404|6|50|20|
کوکی کاراملی بدون گلوتن|Caramel cookie gluten-free|473|5|66|21|
کوکی کاراملی ورزشی|Caramel cookie fitness|421|9|58|17|
کوکی کاراملی بسته‌بندی|Caramel cookie packaged|462|5|70|18|
کوکی اسموریس|Smores cookie|454|5|68|18|
کوکی اسموریس نرم|Smores cookie soft|460|5|65|20|
کوکی اسموریس ترد|Smores cookie crispy|442|6|73|14|
کوکی اسموریس خانگی|Smores cookie homemade|463|5|68|19|
کوکی اسموریس بدون شکر|Smores cookie sugar-free|394|6|52|18|
کوکی اسموریس بدون گلوتن|Smores cookie gluten-free|463|5|68|19|
کوکی اسموریس ورزشی|Smores cookie fitness|411|9|60|15|
کوکی اسموریس بسته‌بندی|Smores cookie packaged|452|5|72|16|
کوکی نوتلا|Nutella cookie|506|6|62|26|
کوکی نوتلا نرم|Nutella cookie soft|512|6|59|28|
کوکی نوتلا ترد|Nutella cookie crispy|494|7|67|22|
کوکی نوتلا خانگی|Nutella cookie homemade|515|6|62|27|
کوکی نوتلا بدون شکر|Nutella cookie sugar-free|446|7|46|26|
کوکی نوتلا بدون گلوتن|Nutella cookie gluten-free|515|6|62|27|
کوکی نوتلا ورزشی|Nutella cookie fitness|463|10|54|23|
کوکی نوتلا بسته‌بندی|Nutella cookie packaged|504|6|66|24|
کوکی کره‌ای نمکی|Salted butter cookie|498|6|60|26|
کوکی کره‌ای نمکی نرم|Salted butter cookie soft|504|6|57|28|
کوکی کره‌ای نمکی ترد|Salted butter cookie crispy|486|7|65|22|
کوکی کره‌ای نمکی خانگی|Salted butter cookie homemade|507|6|60|27|
کوکی کره‌ای نمکی بدون شکر|Salted butter cookie sugar-free|438|7|44|26|
کوکی کره‌ای نمکی بدون گلوتن|Salted butter cookie gluten-free|507|6|60|27|
کوکی کره‌ای نمکی ورزشی|Salted butter cookie fitness|455|10|52|23|
کوکی کره‌ای نمکی بسته‌بندی|Salted butter cookie packaged|496|6|64|24|
کوکی نیویورکی|New York cookie|484|5|62|24|
کوکی نیویورکی نرم|New York cookie soft|490|5|59|26|
کوکی نیویورکی ترد|New York cookie crispy|472|6|67|20|
کوکی نیویورکی خانگی|New York cookie homemade|493|5|62|25|
کوکی نیویورکی بدون شکر|New York cookie sugar-free|424|6|46|24|
کوکی نیویورکی بدون گلوتن|New York cookie gluten-free|493|5|62|25|
کوکی نیویورکی ورزشی|New York cookie fitness|441|9|54|21|
کوکی نیویورکی بسته‌بندی|New York cookie packaged|482|5|66|22|
کوکی رد ولوت|Red velvet cookie|474|5|64|22|
کوکی رد ولوت نرم|Red velvet cookie soft|480|5|61|24|
کوکی رد ولوت ترد|Red velvet cookie crispy|462|6|69|18|
کوکی رد ولوت خانگی|Red velvet cookie homemade|483|5|64|23|
کوکی رد ولوت بدون شکر|Red velvet cookie sugar-free|414|6|48|22|
کوکی رد ولوت بدون گلوتن|Red velvet cookie gluten-free|483|5|64|23|
کوکی رد ولوت ورزشی|Red velvet cookie fitness|431|9|56|19|
کوکی رد ولوت بسته‌بندی|Red velvet cookie packaged|472|5|68|20|
کوکی شکر دارچین|Snickerdoodle|454|5|68|18|
کوکی شکر دارچین نرم|Snickerdoodle soft|460|5|65|20|
کوکی شکر دارچین ترد|Snickerdoodle crispy|442|6|73|14|
کوکی شکر دارچین خانگی|Snickerdoodle homemade|463|5|68|19|
کوکی شکر دارچین بدون شکر|Snickerdoodle sugar-free|394|6|52|18|
کوکی شکر دارچین بدون گلوتن|Snickerdoodle gluten-free|463|5|68|19|
کوکی شکر دارچین ورزشی|Snickerdoodle fitness|411|9|60|15|
کوکی شکر دارچین بسته‌بندی|Snickerdoodle packaged|452|5|72|16|
کوکی بیسکوییتی|Biscuit cookie|434|7|70|14|
کوکی بیسکوییتی نرم|Biscuit cookie soft|440|7|67|16|
کوکی بیسکوییتی ترد|Biscuit cookie crispy|422|8|75|10|
کوکی بیسکوییتی خانگی|Biscuit cookie homemade|443|7|70|15|
کوکی بیسکوییتی بدون شکر|Biscuit cookie sugar-free|374|8|54|14|
کوکی بیسکوییتی بدون گلوتن|Biscuit cookie gluten-free|443|7|70|15|
کوکی بیسکوییتی ورزشی|Biscuit cookie fitness|391|11|62|11|
کوکی بیسکوییتی بسته‌بندی|Biscuit cookie packaged|432|7|74|12|
کوکی جو دوسر|Oat cookie|454|7|66|18|
کوکی جو دوسر نرم|Oat cookie soft|460|7|63|20|
کوکی جو دوسر ترد|Oat cookie crispy|442|8|71|14|
کوکی جو دوسر خانگی|Oat cookie homemade|463|7|66|19|
کوکی جو دوسر بدون شکر|Oat cookie sugar-free|394|8|50|18|
کوکی جو دوسر بدون گلوتن|Oat cookie gluten-free|463|7|66|19|
کوکی جو دوسر ورزشی|Oat cookie fitness|411|11|58|15|
کوکی جو دوسر بسته‌بندی|Oat cookie packaged|452|7|70|16|
کوکی رژیمی|Diet cookie|402|9|60|14|
کوکی رژیمی نرم|Diet cookie soft|408|9|57|16|
کوکی رژیمی ترد|Diet cookie crispy|390|10|65|10|
کوکی رژیمی خانگی|Diet cookie homemade|411|9|60|15|
کوکی رژیمی بدون شکر|Diet cookie sugar-free|342|10|44|14|
کوکی رژیمی بدون گلوتن|Diet cookie gluten-free|411|9|60|15|
کوکی رژیمی ورزشی|Diet cookie fitness|359|13|52|11|
کوکی رژیمی بسته‌بندی|Diet cookie packaged|400|9|64|12|
کوکی پروتئینی|Protein cookie|382|20|44|14|
کوکی پروتئینی نرم|Protein cookie soft|388|20|41|16|
کوکی پروتئینی ترد|Protein cookie crispy|370|21|49|10|
کوکی پروتئینی خانگی|Protein cookie homemade|391|20|44|15|
کوکی پروتئینی بدون شکر|Protein cookie sugar-free|322|21|28|14|
کوکی پروتئینی بدون گلوتن|Protein cookie gluten-free|391|20|44|15|
کوکی پروتئینی ورزشی|Protein cookie fitness|339|24|36|11|
کوکی پروتئینی بسته‌بندی|Protein cookie packaged|380|20|48|12|
کوکی ماچا|Matcha cookie|488|6|62|24|
کوکی ماچا نرم|Matcha cookie soft|494|6|59|26|
کوکی ماچا ترد|Matcha cookie crispy|476|7|67|20|
کوکی ماچا خانگی|Matcha cookie homemade|497|6|62|25|
کوکی ماچا بدون شکر|Matcha cookie sugar-free|428|7|46|24|
کوکی ماچا بدون گلوتن|Matcha cookie gluten-free|497|6|62|25|
کوکی ماچا ورزشی|Matcha cookie fitness|445|10|54|21|
کوکی ماچا بسته‌بندی|Matcha cookie packaged|486|6|66|22|
بیسکویت کرم‌دار شکلاتی|Chocolate cream sandwich biscuit|490|5|68|22|
بیسکویت کرم‌دار وانیلی|Vanilla cream sandwich biscuit|490|5|68|22|
بیسکویت دایجستیو|Digestive biscuit|473|7|64|21|
بیسکویت دایجستیو شکلاتی|Chocolate digestive|496|6|64|24|
بیسکویت ویفری|Wafer biscuit|500|5|66|24|
بیسکویت ویفر شکلاتی|Chocolate wafer|514|6|64|26|
بیسکویت ویفر فندقی|Hazelnut wafer|524|6|62|28|
بیسکویت کاکائویی|Cocoa biscuit|452|7|70|16|
بیسکویت جو|Barley biscuit|448|8|68|16|
بیسکویت شیرین کره‌ای|Buttery biscuit|468|6|66|20|
بیسکویت بچه|Baby biscuit|418|8|74|10|
بیسکویت مغزدار|Filled biscuit|482|5|66|22|
بیسکویت مغزدار شکلاتی|Chocolate filled biscuit|482|5|66|22|
بیسکویت مغزدار توت‌فرنگی|Strawberry filled biscuit|458|4|70|18|
بیسکویت مغزدار پرتقالی|Orange filled biscuit|458|4|70|18|
بیسکویت مغزدار موز|Banana filled biscuit|458|4|70|18|
بیسکویت شکلات‌چیپ|Chocolate chip biscuit|486|6|66|22|
بیسکویت شکلاتی روکش‌دار|Chocolate coated biscuit|514|6|64|26|
بیسکویت کاراملی|Caramel biscuit|490|5|68|22|
بیسکویت پروتئینی|Protein biscuit|388|20|50|12|
بیسکویت اوریو|Oreo-style cookie|467|4|70|19|
بیسکویت لوتوس|Lotus biscuit|461|5|72|17|
بیسکویت دانمارکی|Danish butter cookie|490|5|68|22|
بیسکویت مربایی|Jam biscuit|454|5|68|18|
بیسکویت کنجدی|Sesame biscuit|458|8|66|18|
بیسکویت تخم‌مرغی|Egg biscuit|442|9|70|14|
بیسکویت چای|Tea biscuit|442|7|72|14|
بیسکویت قهوه|Coffee biscuit|458|6|68|18|
بیسکویت کرمدار لیمویی|Lemon cream biscuit|490|5|68|22|
بیسکویت گندمین|Wheat biscuit|447|8|70|15|
بیسکویت ارده‌ای|Tahini biscuit|478|10|60|22|
بیسکویت خرمایی|Date biscuit|448|6|70|16|
کراکر شیرین|Sweet cracker|428|8|72|12|
بیسکویت شیرین روکش شکلات تلخ|Dark chocolate coated biscuit|506|6|62|26|
بیسکویت غلات|Cereal biscuit|448|8|68|16|
بیسکویت جو دوسر عسلی|Honey oat biscuit|454|7|66|18|
بیسکویت ذرت|Corn biscuit|438|6|72|14|
بیسکویت کره بادام‌زمینی|Peanut butter biscuit|482|9|62|22|
مافین شکلاتی کم‌چرب|Low-fat chocolate muffin|352|7|54|12|
مافین شکلاتی بدون شکر|Sugar-free chocolate muffin|328|7|30|20|
کاپ‌کیک شکلاتی|Chocolate cupcake|451|5|56|23|
کاپ‌کیک شکلاتی با فراستینگ|Frosted chocolate cupcake|502|5|62|26|
مافین شکلاتی مینی|Mini chocolate muffin|405|6|48|21|
مافین شکلات‌چیپ|Chocolate chip muffin|391|5|50|19|
مافین شکلات‌چیپ کم‌چرب|Low-fat chocolate chip muffin|347|6|56|11|
مافین شکلات‌چیپ بدون شکر|Sugar-free chocolate chip muffin|323|6|32|19|
کاپ‌کیک شکلات‌چیپ|Chocolate chip cupcake|446|4|58|22|
کاپ‌کیک شکلات‌چیپ با فراستینگ|Frosted chocolate chip cupcake|497|4|64|25|
مافین شکلات‌چیپ مینی|Mini chocolate chip muffin|400|5|50|20|
مافین وانیلی|Vanilla muffin|373|5|50|17|
مافین وانیلی کم‌چرب|Low-fat vanilla muffin|329|6|56|9|
مافین وانیلی بدون شکر|Sugar-free vanilla muffin|305|6|32|17|
کاپ‌کیک وانیلی|Vanilla cupcake|428|4|58|20|
کاپ‌کیک وانیلی با فراستینگ|Frosted vanilla cupcake|479|4|64|23|
مافین وانیلی مینی|Mini vanilla muffin|382|5|50|18|
مافین بلوبری کم‌چرب|Low-fat blueberry muffin|312|6|54|8|
مافین بلوبری بدون شکر|Sugar-free blueberry muffin|288|6|30|16|
کاپ‌کیک بلوبری|Blueberry cupcake|411|4|56|19|
کاپ‌کیک بلوبری با فراستینگ|Frosted blueberry cupcake|462|4|62|22|
مافین بلوبری مینی|Mini blueberry muffin|365|5|48|17|
مافین موزی|Banana muffin|355|5|50|15|
مافین موزی کم‌چرب|Low-fat banana muffin|311|6|56|7|
مافین موزی بدون شکر|Sugar-free banana muffin|287|6|32|15|
کاپ‌کیک موزی|Banana cupcake|410|4|58|18|
کاپ‌کیک موزی با فراستینگ|Frosted banana cupcake|461|4|64|21|
مافین موزی مینی|Mini banana muffin|364|5|50|16|
مافین لیمویی|Lemon muffin|372|5|52|16|
مافین لیمویی کم‌چرب|Low-fat lemon muffin|328|6|58|8|
مافین لیمویی بدون شکر|Sugar-free lemon muffin|304|6|34|16|
کاپ‌کیک لیمویی|Lemon cupcake|427|4|60|19|
کاپ‌کیک لیمویی با فراستینگ|Frosted lemon cupcake|478|4|66|22|
مافین لیمویی مینی|Mini lemon muffin|381|5|52|17|
مافین هویج و گردو|Carrot walnut muffin|379|6|46|19|
مافین هویج و گردو کم‌چرب|Low-fat carrot walnut muffin|335|7|52|11|
مافین هویج و گردو بدون شکر|Sugar-free carrot walnut muffin|311|7|28|19|
کاپ‌کیک هویج و گردو|Carrot walnut cupcake|434|5|54|22|
کاپ‌کیک هویج و گردو با فراستینگ|Frosted carrot walnut cupcake|485|5|60|25|
مافین هویج و گردو مینی|Mini carrot walnut muffin|388|6|46|20|
مافین سیب و دارچین|Apple cinnamon muffin|351|4|50|15|
مافین سیب و دارچین کم‌چرب|Low-fat apple cinnamon muffin|307|5|56|7|
مافین سیب و دارچین بدون شکر|Sugar-free apple cinnamon muffin|283|5|32|15|
کاپ‌کیک سیب و دارچین|Apple cinnamon cupcake|406|3|58|18|
کاپ‌کیک سیب و دارچین با فراستینگ|Frosted apple cinnamon cupcake|457|3|64|21|
مافین سیب و دارچین مینی|Mini apple cinnamon muffin|360|4|50|16|
مافین توت‌فرنگی|Strawberry muffin|351|4|50|15|
مافین توت‌فرنگی کم‌چرب|Low-fat strawberry muffin|307|5|56|7|
مافین توت‌فرنگی بدون شکر|Sugar-free strawberry muffin|283|5|32|15|
کاپ‌کیک توت‌فرنگی|Strawberry cupcake|406|3|58|18|
کاپ‌کیک توت‌فرنگی با فراستینگ|Frosted strawberry cupcake|457|3|64|21|
مافین توت‌فرنگی مینی|Mini strawberry muffin|360|4|50|16|
مافین نارگیلی کم‌چرب|Low-fat coconut muffin|348|6|54|12|
مافین نارگیلی بدون شکر|Sugar-free coconut muffin|324|6|30|20|
کاپ‌کیک نارگیلی|Coconut cupcake|447|4|56|23|
کاپ‌کیک نارگیلی با فراستینگ|Frosted coconut cupcake|498|4|62|26|
مافین نارگیلی مینی|Mini coconut muffin|401|5|48|21|
مافین کدو حلوایی|Pumpkin muffin|356|5|48|16|
مافین کدو حلوایی کم‌چرب|Low-fat pumpkin muffin|312|6|54|8|
مافین کدو حلوایی بدون شکر|Sugar-free pumpkin muffin|288|6|30|16|
کاپ‌کیک کدو حلوایی|Pumpkin cupcake|411|4|56|19|
کاپ‌کیک کدو حلوایی با فراستینگ|Frosted pumpkin cupcake|462|4|62|22|
مافین کدو حلوایی مینی|Mini pumpkin muffin|365|5|48|17|
مافین کره بادام‌زمینی کم‌چرب|Low-fat peanut butter muffin|370|9|52|14|
مافین کره بادام‌زمینی بدون شکر|Sugar-free peanut butter muffin|346|9|28|22|
کاپ‌کیک کره بادام‌زمینی|Peanut butter cupcake|469|7|54|25|
کاپ‌کیک کره بادام‌زمینی با فراستینگ|Frosted peanut butter cupcake|520|7|60|28|
مافین کره بادام‌زمینی مینی|Mini peanut butter muffin|423|8|46|23|
مافین پرتقالی|Orange muffin|364|5|50|16|
مافین پرتقالی کم‌چرب|Low-fat orange muffin|320|6|56|8|
مافین پرتقالی بدون شکر|Sugar-free orange muffin|296|6|32|16|
کاپ‌کیک پرتقالی|Orange cupcake|419|4|58|19|
کاپ‌کیک پرتقالی با فراستینگ|Frosted orange cupcake|470|4|64|22|
مافین پرتقالی مینی|Mini orange muffin|373|5|50|17|
مافین قهوه|Coffee muffin|373|5|50|17|
مافین قهوه کم‌چرب|Low-fat coffee muffin|329|6|56|9|
مافین قهوه بدون شکر|Sugar-free coffee muffin|305|6|32|17|
کاپ‌کیک قهوه|Coffee cupcake|428|4|58|20|
کاپ‌کیک قهوه با فراستینگ|Frosted coffee cupcake|479|4|64|23|
مافین قهوه مینی|Mini coffee muffin|382|5|50|18|
مافین فندقی|Hazelnut muffin|405|6|48|21|
مافین فندقی کم‌چرب|Low-fat hazelnut muffin|361|7|54|13|
مافین فندقی بدون شکر|Sugar-free hazelnut muffin|337|7|30|21|
کاپ‌کیک فندقی|Hazelnut cupcake|460|5|56|24|
کاپ‌کیک فندقی با فراستینگ|Frosted hazelnut cupcake|511|5|62|27|
مافین فندقی مینی|Mini hazelnut muffin|414|6|48|22|
مافین انجیری|Fig muffin|363|5|52|15|
مافین انجیری کم‌چرب|Low-fat fig muffin|319|6|58|7|
مافین انجیری بدون شکر|Sugar-free fig muffin|295|6|34|15|
کاپ‌کیک انجیری|Fig cupcake|418|4|60|18|
کاپ‌کیک انجیری با فراستینگ|Frosted fig cupcake|469|4|66|21|
مافین انجیری مینی|Mini fig muffin|372|5|52|16|
مافین آلبالو|Sour cherry muffin|355|5|50|15|
مافین آلبالو کم‌چرب|Low-fat sour cherry muffin|311|6|56|7|
مافین آلبالو بدون شکر|Sugar-free sour cherry muffin|287|6|32|15|
کاپ‌کیک آلبالو|Sour cherry cupcake|410|4|58|18|
کاپ‌کیک آلبالو با فراستینگ|Frosted sour cherry cupcake|461|4|64|21|
مافین آلبالو مینی|Mini sour cherry muffin|364|5|50|16|
مافین خرما|Date muffin|362|5|54|14|
مافین خرما کم‌چرب|Low-fat date muffin|318|6|60|6|
مافین خرما بدون شکر|Sugar-free date muffin|294|6|36|14|
کاپ‌کیک خرما|Date cupcake|417|4|62|17|
کاپ‌کیک خرما با فراستینگ|Frosted date cupcake|468|4|68|20|
مافین خرما مینی|Mini date muffin|371|5|54|15|
مافین نوتلا|Nutella-filled muffin|421|6|52|21|
مافین نوتلا کم‌چرب|Low-fat Nutella-filled muffin|377|7|58|13|
مافین نوتلا بدون شکر|Sugar-free Nutella-filled muffin|353|7|34|21|
کاپ‌کیک نوتلا|Nutella-filled cupcake|476|5|60|24|
کاپ‌کیک نوتلا با فراستینگ|Frosted Nutella-filled cupcake|527|5|66|27|
مافین نوتلا مینی|Mini Nutella-filled muffin|430|6|52|22|
مافین پسته|Pistachio muffin|401|7|46|21|
مافین پسته کم‌چرب|Low-fat pistachio muffin|357|8|52|13|
مافین پسته بدون شکر|Sugar-free pistachio muffin|333|8|28|21|
کاپ‌کیک پسته|Pistachio cupcake|456|6|54|24|
کاپ‌کیک پسته با فراستینگ|Frosted pistachio cupcake|507|6|60|27|
مافین پسته مینی|Mini pistachio muffin|410|7|46|22|
مافین تمشک|Raspberry muffin|360|4|50|16|
مافین تمشک کم‌چرب|Low-fat raspberry muffin|316|5|56|8|
مافین تمشک بدون شکر|Sugar-free raspberry muffin|292|5|32|16|
کاپ‌کیک تمشک|Raspberry cupcake|415|3|58|19|
کاپ‌کیک تمشک با فراستینگ|Frosted raspberry cupcake|466|3|64|22|
مافین تمشک مینی|Mini raspberry muffin|369|4|50|17|
مافین زنجبیلی|Ginger muffin|362|5|54|14|
مافین زنجبیلی کم‌چرب|Low-fat ginger muffin|318|6|60|6|
مافین زنجبیلی بدون شکر|Sugar-free ginger muffin|294|6|36|14|
کاپ‌کیک زنجبیلی|Ginger cupcake|417|4|62|17|
کاپ‌کیک زنجبیلی با فراستینگ|Frosted ginger cupcake|468|4|68|20|
مافین زنجبیلی مینی|Mini ginger muffin|371|5|54|15|
مافین جو دوسر کم‌چرب|Low-fat oat muffin|306|9|54|6|
مافین جو دوسر بدون شکر|Sugar-free oat muffin|282|9|30|14|
کاپ‌کیک جو دوسر|Oat cupcake|405|7|56|17|
کاپ‌کیک جو دوسر با فراستینگ|Frosted oat cupcake|456|7|62|20|
مافین جو دوسر مینی|Mini oat muffin|359|8|48|15|
مافین پروتئینی|Protein muffin|274|18|28|10|
مافین پروتئینی کم‌چرب|Low-fat protein muffin|230|19|34|2|
مافین پروتئینی بدون شکر|Sugar-free protein muffin|206|19|10|10|
کاپ‌کیک پروتئینی|Protein cupcake|329|17|36|13|
کاپ‌کیک پروتئینی با فراستینگ|Frosted protein cupcake|380|17|42|16|
مافین پروتئینی مینی|Mini protein muffin|283|18|28|11|
مافین کدو سبز|Zucchini muffin|349|5|44|17|
مافین کدو سبز کم‌چرب|Low-fat zucchini muffin|305|6|50|9|
مافین کدو سبز بدون شکر|Sugar-free zucchini muffin|281|6|26|17|
کاپ‌کیک کدو سبز|Zucchini cupcake|404|4|52|20|
کاپ‌کیک کدو سبز با فراستینگ|Frosted zucchini cupcake|455|4|58|23|
مافین کدو سبز مینی|Mini zucchini muffin|358|5|44|18|
مافین گیلاس|Cherry muffin|364|5|50|16|
مافین گیلاس کم‌چرب|Low-fat cherry muffin|320|6|56|8|
مافین گیلاس بدون شکر|Sugar-free cherry muffin|296|6|32|16|
کاپ‌کیک گیلاس|Cherry cupcake|419|4|58|19|
کاپ‌کیک گیلاس با فراستینگ|Frosted cherry cupcake|470|4|64|22|
مافین گیلاس مینی|Mini cherry muffin|373|5|50|17|
مافین کارامل|Caramel muffin|390|5|52|18|
مافین کارامل کم‌چرب|Low-fat caramel muffin|346|6|58|10|
مافین کارامل بدون شکر|Sugar-free caramel muffin|322|6|34|18|
کاپ‌کیک کارامل|Caramel cupcake|445|4|60|21|
کاپ‌کیک کارامل با فراستینگ|Frosted caramel cupcake|496|4|66|24|
مافین کارامل مینی|Mini caramel muffin|399|5|52|19|
مافین ماست و میوه|Yogurt fruit muffin|333|6|48|13|
مافین ماست و میوه کم‌چرب|Low-fat yogurt fruit muffin|289|7|54|5|
مافین ماست و میوه بدون شکر|Sugar-free yogurt fruit muffin|265|7|30|13|
کاپ‌کیک ماست و میوه|Yogurt fruit cupcake|388|5|56|16|
کاپ‌کیک ماست و میوه با فراستینگ|Frosted yogurt fruit cupcake|439|5|62|19|
مافین ماست و میوه مینی|Mini yogurt fruit muffin|342|6|48|14|
مافین شیر و عسل|Milk honey muffin|350|6|50|14|
مافین شیر و عسل کم‌چرب|Low-fat milk honey muffin|306|7|56|6|
مافین شیر و عسل بدون شکر|Sugar-free milk honey muffin|282|7|32|14|
کاپ‌کیک شیر و عسل|Milk honey cupcake|405|5|58|17|
کاپ‌کیک شیر و عسل با فراستینگ|Frosted milk honey cupcake|456|5|64|20|
مافین شیر و عسل مینی|Mini milk honey muffin|359|6|50|15|
مافین کشمشی|Raisin muffin|362|5|54|14|
مافین کشمشی کم‌چرب|Low-fat raisin muffin|318|6|60|6|
مافین کشمشی بدون شکر|Sugar-free raisin muffin|294|6|36|14|
کاپ‌کیک کشمشی|Raisin cupcake|417|4|62|17|
کاپ‌کیک کشمشی با فراستینگ|Frosted raisin cupcake|468|4|68|20|
مافین کشمشی مینی|Mini raisin muffin|371|5|54|15|
دونات ساده|Plain glazed donut|414|4|50|22|
دونات ساده فر|Baked plain glazed donut|354|5|52|14|
دونات شکلاتی فر|Baked chocolate glazed donut|354|5|52|14|
دونات شکر پودری|Powdered sugar donut|400|5|50|20|
دونات شکر پودری فر|Baked powdered sugar donut|340|6|52|12|
دونات دارچینی|Cinnamon sugar donut|400|5|50|20|
دونات دارچینی فر|Baked cinnamon sugar donut|340|6|52|12|
دونات خامه‌ای فر|Baked cream filled donut|348|5|46|16|
دونات مربایی فر|Baked jelly filled donut|326|5|54|10|
دونات شکلات‌چیپ|Chocolate sprinkles donut|422|4|52|22|
دونات شکلات‌چیپ فر|Baked chocolate sprinkles donut|362|5|54|14|
دونات کارامل|Caramel donut|422|4|52|22|
دونات کارامل فر|Baked caramel donut|362|5|54|14|
دونات بلوبری|Blueberry donut|396|4|50|20|
دونات بلوبری فر|Baked blueberry donut|336|5|52|12|
دونات توت‌فرنگی|Strawberry glazed donut|404|4|52|20|
دونات توت‌فرنگی فر|Baked strawberry glazed donut|344|5|54|12|
دونات نوتلا|Nutella filled donut|436|5|50|24|
دونات نوتلا فر|Baked Nutella filled donut|376|6|52|16|
دونات فندقی|Hazelnut donut|436|5|50|24|
دونات فندقی فر|Baked hazelnut donut|376|6|52|16|
دونات لوتوس|Lotus donut|422|4|52|22|
دونات لوتوس فر|Baked Lotus donut|362|5|54|14|
دونات پسته|Pistachio donut|428|5|48|24|
دونات پسته فر|Baked pistachio donut|368|6|50|16|
دونات وانیلی کرم|Vanilla custard donut|402|5|46|22|
دونات وانیلی کرم فر|Baked vanilla custard donut|342|6|48|14|
دونات قهوه|Coffee glazed donut|422|4|52|22|
دونات قهوه فر|Baked coffee glazed donut|362|5|54|14|
دونات نارگیلی فر|Baked coconut donut|372|5|52|16|
دونات لیمو|Lemon donut|404|4|52|20|
دونات لیمو فر|Baked lemon donut|344|5|54|12|
دونات اوریو|Oreo donut|422|4|52|22|
دونات اوریو فر|Baked Oreo donut|362|5|54|14|
دونات شکلات سفید|White chocolate donut|422|4|52|22|
دونات شکلات سفید فر|Baked white chocolate donut|362|5|54|14|
دونات رد ولوت|Red velvet donut|422|4|52|22|
دونات رد ولوت فر|Baked red velvet donut|362|5|54|14|
دونات پنیر خامه‌ای|Cream cheese donut|420|5|46|24|
دونات پنیر خامه‌ای فر|Baked cream cheese donut|360|6|48|16|
دونات مینی|Mini donut|414|4|50|22|
دونات مینی فر|Baked mini donut|354|5|52|14|
دونات بدون شکر|Sugar-free donut|354|5|34|22|
دونات بدون شکر فر|Baked sugar-free donut|294|6|36|14|
دونات بیکد|Baked donut|320|5|48|12|
دونات بیکد فر|Baked baked donut|260|6|50|4|
دونات وگان|Vegan donut|404|4|52|20|
دونات وگان فر|Baked vegan donut|344|5|54|12|
کروسان ساده|Plain croissant|405|8|46|21|
کروسان کره‌ای|Butter croissant|419|8|45|23|
کروسان شکلاتی|Chocolate croissant|432|8|46|24|
کروسان بادام|Almond croissant|434|10|40|26|
کروسان پنیر|Cheese croissant|430|11|38|26|
کروسان ژامبون و پنیر|Ham and cheese croissant|374|12|32|22|
کروسان مرغ|Chicken croissant|334|13|30|18|
کروسان پسته|Pistachio croissant|438|9|42|26|
کروسان نوتلا|Nutella croissant|449|8|48|25|
کروسان کرم|Custard croissant|406|8|44|22|
کروسان زعفرانی|Saffron croissant|414|8|46|22|
کروسان مربایی|Jam croissant|389|7|52|17|
کروسان نمکی|Savory croissant|394|9|40|22|
کروسان اسفناج و پنیر|Spinach cheese croissant|374|10|34|22|
کروسان تن|Tuna croissant|338|12|32|18|
کروسان کم‌چرب|Light croissant|344|9|50|12|
مینی کروسان|Mini croissant|414|8|46|22|
کروسان کارامل|Caramel croissant|426|7|50|22|
کروسان نارگیل|Coconut croissant|437|7|46|25|
کروسان توت‌فرنگی|Strawberry croissant|418|7|48|22|
کروسان هویج|Carrot croissant|396|8|46|20|
کروسان فندق|Hazelnut croissant|437|9|44|25|
کروسان لوتوس|Lotus croissant|440|8|48|24|
کروسان پنیر خامه‌ای|Cream cheese croissant|429|9|42|25|
کروسان تخم‌مرغ|Egg croissant|364|12|34|20|
پن او شوکولا|Pain au chocolat|424|8|44|24|
پن او ریزن|Pain aux raisins|373|7|48|17|
دانیش پنیر|Cheese danish|360|7|38|20|
دانیش سیب|Apple danish|348|5|46|16|
دانیش توت|Berry danish|348|5|46|16|
دانیش کرم|Custard danish|354|6|42|18|
`;
const S2 = `
دانیش بادام|Almond danish|394|7|42|22|
دانیش گیلاس|Cherry danish|348|5|46|16|
دانیش پسته|Pistachio danish|394|7|42|22|
دانیش شکلاتی|Chocolate danish|398|6|44|22|
بریوش ساده|Plain brioche|362|9|50|14|
بریوش شکلاتی|Chocolate brioche|385|8|50|17|
بریوش کره‌ای|Butter brioche|381|9|48|17|
بریوش دارچین|Cinnamon brioche|366|8|52|14|
بریوش شکرپاش|Pearl sugar brioche|374|8|54|14|
بریوش با کرم|Brioche with cream|369|8|46|17|
رول دارچین|Cinnamon roll|349|6|52|13|
رول دارچین با گلیز|Glazed cinnamon roll|370|5|56|14|
رول دارچین پکان|Pecan cinnamon roll|386|6|50|18|
رول دارچین کم‌شیرین|Light cinnamon roll|310|7|48|10|
رول دارچین با کرم پنیر|Cream cheese cinnamon roll|376|6|52|16|
رول کره‌ای|Butter roll|340|8|50|12|
اسکون ساده|Plain scone|354|7|50|14|
اسکون کشمشی|Raisin scone|353|7|52|13|
اسکون شکلاتی|Chocolate scone|390|7|50|18|
اسکون بلوبری|Blueberry scone|354|7|50|14|
اسکون پنیری|Cheese scone|376|11|38|20|
اسکون با خامه و مربا|Scone with cream and jam|359|6|50|15|
اسکون لیمو|Lemon scone|362|7|52|14|
اسکون کدو|Pumpkin scone|350|6|50|14|
اسکون نارگیل|Coconut scone|390|7|50|18|
اسکون سیب|Apple scone|358|6|52|14|
پالمیه|Palmier|466|6|52|26|
پالمیه شکلاتی|Chocolate palmier|484|6|52|28|
پالمیه دارچین|Cinnamon palmier|466|6|52|26|
پف پاستری ساده|Puff pastry plain|550|7|45|38|
استرودل سیب|Apple strudel|272|3|38|12|
استرودل گیلاس|Cherry strudel|280|3|40|12|
استرودل پنیر|Cheese strudel|278|6|32|14|
استرودل گردو|Walnut strudel|342|5|40|18|
پیراشکی شیرین|Sweet pastry roll|356|5|48|16|
پیراشکی پنیر|Cheese piroshki|298|9|34|14|
پیراشکی سیب‌زمینی|Potato piroshki|272|5|36|12|
پیراشکی مرغ|Chicken piroshki|290|11|30|14|
پیراشکی سبزیجات|Vegetable piroshki|264|5|34|12|
پیراشکی قارچ|Mushroom piroshki|277|6|34|13|
پیراشکی ژامبون و پنیر|Ham and cheese piroshki|312|10|32|16|
پیراشکی سوسیس|Sausage piroshki|326|9|32|18|
پیراشکی ماکارونی|Macaroni piroshki|276|6|36|12|
پیراشکی کدو|Pumpkin piroshki|288|5|40|12|
پیراشکی پنیر و اسفناج|Spinach cheese piroshki|286|8|32|14|
پیراشکی پنیر پیتزا|Pizza cheese piroshki|307|9|34|15|
پیراشکی تن|Tuna piroshki|285|10|32|13|
پیراشکی کشک بادمجان|Eggplant kashk piroshki|264|5|34|12|
نان شیرین کره‌ای|Sweet butter bun|348|8|52|12|
نان شیرین دارچینی|Sweet cinnamon bun|334|7|54|10|
نان شکلاتی|Chocolate bread|340|8|50|12|
نان خامه‌ای مغزدار|Cream filled bun|346|7|48|14|
نان پیراشکی شیرین|Sweet filled bun|336|7|50|12|
نان موزی|Banana bread|336|5|52|12|
نان کدو حلوایی|Pumpkin bread|328|5|50|12|
نان هویج|Carrot bread|338|5|48|14|
نان گردویی شیرین|Sweet walnut bread|374|7|46|18|
نان نارگیلی شیرین|Sweet coconut bread|360|6|48|16|
نان لیمویی|Lemon bread|354|5|52|14|
نان زنجبیلی شیرین|Sweet gingerbread loaf|342|5|58|10|
نان خرمایی شیرین|Sweet date bread|330|6|54|10|
نان شیری ساده|Plain milk bread|290|9|50|6|
نان شیری شکری|Sugar milk bun|328|8|56|8|
نان مربایی|Jam bun|324|7|56|8|
نان کره‌ای مینی|Mini butter bun|340|8|50|12|
نان عسلی نرم|Soft honey bun|328|8|56|8|
تارت سیب|Apple tart|256|3|34|12|
پای سیب با سقف شبکه‌ای|Lattice apple pie|251|2|36|11|
تارتلت سیب|Apple tartlet|273|3|36|13|
کراستاتا سیب|Apple crostata|259|3|37|11|
کابلر سیب|Apple cobbler|210|1|38|6|
کرامبل سیب|Apple crumble|236|2|39|8|
تارت سیب مینی|Mini apple tart|269|3|35|13|
پای سیب خانگی|Homemade apple pie|243|2|34|11|
پای هلو|Peach pie|234|2|34|10|
تارت هلو|Peach tart|256|3|34|12|
پای هلو با سقف شبکه‌ای|Lattice peach pie|251|2|36|11|
تارتلت هلو|Peach tartlet|273|3|36|13|
کراستاتا هلو|Peach crostata|259|3|37|11|
کابلر هلو|Peach cobbler|210|1|38|6|
کرامبل هلو|Peach crumble|236|2|39|8|
تارت هلو مینی|Mini peach tart|269|3|35|13|
پای هلو خانگی|Homemade peach pie|243|2|34|11|
پای گیلاس|Cherry pie|242|2|36|10|
تارت گیلاس|Cherry tart|264|3|36|12|
پای گیلاس با سقف شبکه‌ای|Lattice cherry pie|259|2|38|11|
تارتلت گیلاس|Cherry tartlet|281|3|38|13|
کراستاتا گیلاس|Cherry crostata|267|3|39|11|
کابلر گیلاس|Cherry cobbler|218|1|40|6|
کرامبل گیلاس|Cherry crumble|244|2|41|8|
تارت گیلاس مینی|Mini cherry tart|277|3|37|13|
پای گیلاس خانگی|Homemade cherry pie|251|2|36|11|
پای بلوبری|Blueberry pie|238|2|35|10|
تارت بلوبری|Blueberry tart|260|3|35|12|
پای بلوبری با سقف شبکه‌ای|Lattice blueberry pie|255|2|37|11|
تارتلت بلوبری|Blueberry tartlet|277|3|37|13|
کراستاتا بلوبری|Blueberry crostata|263|3|38|11|
کابلر بلوبری|Blueberry cobbler|214|1|39|6|
کرامبل بلوبری|Blueberry crumble|240|2|40|8|
تارت بلوبری مینی|Mini blueberry tart|273|3|36|13|
پای بلوبری خانگی|Homemade blueberry pie|247|2|35|11|
پای توت‌فرنگی|Strawberry pie|226|2|32|10|
پای توت‌فرنگی با سقف شبکه‌ای|Lattice strawberry pie|243|2|34|11|
تارتلت توت‌فرنگی|Strawberry tartlet|265|3|34|13|
کراستاتا توت‌فرنگی|Strawberry crostata|251|3|35|11|
کابلر توت‌فرنگی|Strawberry cobbler|202|1|36|6|
کرامبل توت‌فرنگی|Strawberry crumble|228|2|37|8|
تارت توت‌فرنگی مینی|Mini strawberry tart|261|3|33|13|
پای توت‌فرنگی خانگی|Homemade strawberry pie|235|2|32|11|
تارت لیمو|Lemon tart|294|4|38|14|
پای لیمو با سقف شبکه‌ای|Lattice lemon pie|289|3|40|13|
تارتلت لیمو|Lemon tartlet|311|4|40|15|
کراستاتا لیمو|Lemon crostata|297|4|41|13|
کابلر لیمو|Lemon cobbler|248|2|42|8|
کرامبل لیمو|Lemon crumble|274|3|43|10|
تارت لیمو مینی|Mini lemon tart|307|4|39|15|
پای لیمو خانگی|Homemade lemon pie|281|3|38|13|
تارت کدو حلوایی|Pumpkin tart|248|5|30|12|
پای کدو حلوایی با سقف شبکه‌ای|Lattice pumpkin pie|243|4|32|11|
تارتلت کدو حلوایی|Pumpkin tartlet|265|5|32|13|
کراستاتا کدو حلوایی|Pumpkin crostata|251|5|33|11|
کابلر کدو حلوایی|Pumpkin cobbler|202|3|34|6|
کرامبل کدو حلوایی|Pumpkin crumble|228|4|35|8|
تارت کدو حلوایی مینی|Mini pumpkin tart|261|5|31|13|
پای کدو حلوایی خانگی|Homemade pumpkin pie|235|4|30|11|
پای موز|Banana pie|264|3|36|12|
تارت موز|Banana tart|286|4|36|14|
پای موز با سقف شبکه‌ای|Lattice banana pie|281|3|38|13|
تارتلت موز|Banana tartlet|303|4|38|15|
کراستاتا موز|Banana crostata|289|4|39|13|
کابلر موز|Banana cobbler|240|2|40|8|
کرامبل موز|Banana crumble|266|3|41|10|
تارت موز مینی|Mini banana tart|299|4|37|15|
پای موز خانگی|Homemade banana pie|273|3|36|13|
پای انبه|Mango pie|234|2|34|10|
تارت انبه|Mango tart|256|3|34|12|
پای انبه با سقف شبکه‌ای|Lattice mango pie|251|2|36|11|
تارتلت انبه|Mango tartlet|273|3|36|13|
کراستاتا انبه|Mango crostata|259|3|37|11|
کابلر انبه|Mango cobbler|210|1|38|6|
کرامبل انبه|Mango crumble|236|2|39|8|
تارت انبه مینی|Mini mango tart|269|3|35|13|
پای انبه خانگی|Homemade mango pie|243|2|34|11|
پای گلابی|Pear pie|234|2|34|10|
تارت گلابی|Pear tart|256|3|34|12|
پای گلابی با سقف شبکه‌ای|Lattice pear pie|251|2|36|11|
تارتلت گلابی|Pear tartlet|273|3|36|13|
کراستاتا گلابی|Pear crostata|259|3|37|11|
کابلر گلابی|Pear cobbler|210|1|38|6|
کرامبل گلابی|Pear crumble|236|2|39|8|
تارت گلابی مینی|Mini pear tart|269|3|35|13|
پای گلابی خانگی|Homemade pear pie|243|2|34|11|
پای آلبالو|Sour cherry pie|242|2|36|10|
تارت آلبالو|Sour cherry tart|264|3|36|12|
پای آلبالو با سقف شبکه‌ای|Lattice sour cherry pie|259|2|38|11|
تارتلت آلبالو|Sour cherry tartlet|281|3|38|13|
کراستاتا آلبالو|Sour cherry crostata|267|3|39|11|
کابلر آلبالو|Sour cherry cobbler|218|1|40|6|
کرامبل آلبالو|Sour cherry crumble|244|2|41|8|
تارت آلبالو مینی|Mini sour cherry tart|277|3|37|13|
پای آلبالو خانگی|Homemade sour cherry pie|251|2|36|11|
پای تمشک|Raspberry pie|234|2|34|10|
تارت تمشک|Raspberry tart|256|3|34|12|
پای تمشک با سقف شبکه‌ای|Lattice raspberry pie|251|2|36|11|
تارتلت تمشک|Raspberry tartlet|273|3|36|13|
کراستاتا تمشک|Raspberry crostata|259|3|37|11|
کابلر تمشک|Raspberry cobbler|210|1|38|6|
کرامبل تمشک|Raspberry crumble|236|2|39|8|
تارت تمشک مینی|Mini raspberry tart|269|3|35|13|
پای تمشک خانگی|Homemade raspberry pie|243|2|34|11|
پای آناناس|Pineapple pie|242|2|36|10|
تارت آناناس|Pineapple tart|264|3|36|12|
پای آناناس با سقف شبکه‌ای|Lattice pineapple pie|259|2|38|11|
تارتلت آناناس|Pineapple tartlet|281|3|38|13|
کراستاتا آناناس|Pineapple crostata|267|3|39|11|
کابلر آناناس|Pineapple cobbler|218|1|40|6|
کرامبل آناناس|Pineapple crumble|244|2|41|8|
تارت آناناس مینی|Mini pineapple tart|277|3|37|13|
پای آناناس خانگی|Homemade pineapple pie|251|2|36|11|
پای شکلات|Chocolate pie|296|4|34|16|
تارت شکلات|Chocolate tart|318|5|34|18|
پای شکلات با سقف شبکه‌ای|Lattice chocolate pie|313|4|36|17|
تارتلت شکلات|Chocolate tartlet|335|5|36|19|
کراستاتا شکلات|Chocolate crostata|321|5|37|17|
کابلر شکلات|Chocolate cobbler|272|3|38|12|
کرامبل شکلات|Chocolate crumble|298|4|39|14|
تارت شکلات مینی|Mini chocolate tart|331|5|35|19|
پای شکلات خانگی|Homemade chocolate pie|305|4|34|17|
پای کارامل|Caramel pie|290|3|38|14|
تارت کارامل|Caramel tart|312|4|38|16|
پای کارامل با سقف شبکه‌ای|Lattice caramel pie|307|3|40|15|
تارتلت کارامل|Caramel tartlet|329|4|40|17|
کراستاتا کارامل|Caramel crostata|315|4|41|15|
کابلر کارامل|Caramel cobbler|266|2|42|10|
کرامبل کارامل|Caramel crumble|292|3|43|12|
تارت کارامل مینی|Mini caramel tart|325|4|39|17|
پای کارامل خانگی|Homemade caramel pie|299|3|38|15|
تارت پکان|Pecan tart|390|6|42|22|
پای پکان با سقف شبکه‌ای|Lattice pecan pie|385|5|44|21|
تارتلت پکان|Pecan tartlet|407|6|44|23|
کراستاتا پکان|Pecan crostata|393|6|45|21|
کابلر پکان|Pecan cobbler|344|4|46|16|
کرامبل پکان|Pecan crumble|370|5|47|18|
تارت پکان مینی|Mini pecan tart|403|6|43|23|
پای پکان خانگی|Homemade pecan pie|377|5|42|21|
پای نارگیل|Coconut pie|302|3|32|18|
تارت نارگیل|Coconut tart|324|4|32|20|
پای نارگیل با سقف شبکه‌ای|Lattice coconut pie|319|3|34|19|
تارتلت نارگیل|Coconut tartlet|341|4|34|21|
کراستاتا نارگیل|Coconut crostata|327|4|35|19|
کابلر نارگیل|Coconut cobbler|278|2|36|14|
کرامبل نارگیل|Coconut crumble|304|3|37|16|
تارت نارگیل مینی|Mini coconut tart|337|4|33|21|
پای نارگیل خانگی|Homemade coconut pie|311|3|32|19|
تارت گردو|Walnut tart|366|6|36|22|
پای گردو با سقف شبکه‌ای|Lattice walnut pie|361|5|38|21|
تارتلت گردو|Walnut tartlet|383|6|38|23|
کراستاتا گردو|Walnut crostata|369|6|39|21|
کابلر گردو|Walnut cobbler|320|4|40|16|
کرامبل گردو|Walnut crumble|346|5|41|18|
تارت گردو مینی|Mini walnut tart|379|6|37|23|
پای گردو خانگی|Homemade walnut pie|353|5|36|21|
پای کرم وانیلی|Vanilla custard pie|240|5|28|12|
تارت کرم وانیلی|Vanilla custard tart|262|6|28|14|
پای کرم وانیلی با سقف شبکه‌ای|Lattice vanilla custard pie|257|5|30|13|
تارتلت کرم وانیلی|Vanilla custard tartlet|279|6|30|15|
کراستاتا کرم وانیلی|Vanilla custard crostata|265|6|31|13|
کابلر کرم وانیلی|Vanilla custard cobbler|216|4|32|8|
کرامبل کرم وانیلی|Vanilla custard crumble|242|5|33|10|
تارت کرم وانیلی مینی|Mini vanilla custard tart|275|6|29|15|
پای کرم وانیلی خانگی|Homemade vanilla custard pie|249|5|28|13|
پای پنیر|Cheese pie|290|6|26|18|
تارت پنیر|Cheese tart|312|7|26|20|
پای پنیر با سقف شبکه‌ای|Lattice cheese pie|307|6|28|19|
تارتلت پنیر|Cheese tartlet|329|7|28|21|
کراستاتا پنیر|Cheese crostata|315|7|29|19|
کابلر پنیر|Cheese cobbler|266|5|30|14|
کرامبل پنیر|Cheese crumble|292|6|31|16|
تارت پنیر مینی|Mini cheese tart|325|7|27|21|
پای پنیر خانگی|Homemade cheese pie|299|6|26|19|
پای زردآلو|Apricot pie|234|2|34|10|
تارت زردآلو|Apricot tart|256|3|34|12|
پای زردآلو با سقف شبکه‌ای|Lattice apricot pie|251|2|36|11|
تارتلت زردآلو|Apricot tartlet|273|3|36|13|
کراستاتا زردآلو|Apricot crostata|259|3|37|11|
کابلر زردآلو|Apricot cobbler|210|1|38|6|
کرامبل زردآلو|Apricot crumble|236|2|39|8|
تارت زردآلو مینی|Mini apricot tart|269|3|35|13|
پای زردآلو خانگی|Homemade apricot pie|243|2|34|11|
پای انجیر|Fig pie|250|2|38|10|
تارت انجیر|Fig tart|272|3|38|12|
پای انجیر با سقف شبکه‌ای|Lattice fig pie|267|2|40|11|
تارتلت انجیر|Fig tartlet|289|3|40|13|
کراستاتا انجیر|Fig crostata|275|3|41|11|
کابلر انجیر|Fig cobbler|226|1|42|6|
کرامبل انجیر|Fig crumble|252|2|43|8|
تارت انجیر مینی|Mini fig tart|285|3|39|13|
پای انجیر خانگی|Homemade fig pie|259|2|38|11|
پای به|Quince pie|234|2|34|10|
تارت به|Quince tart|256|3|34|12|
پای به با سقف شبکه‌ای|Lattice quince pie|251|2|36|11|
تارتلت به|Quince tartlet|273|3|36|13|
کراستاتا به|Quince crostata|259|3|37|11|
کابلر به|Quince cobbler|210|1|38|6|
کرامبل به|Quince crumble|236|2|39|8|
تارت به مینی|Mini quince tart|269|3|35|13|
پای به خانگی|Homemade quince pie|243|2|34|11|
پای انگور|Grape pie|234|2|34|10|
تارت انگور|Grape tart|256|3|34|12|
پای انگور با سقف شبکه‌ای|Lattice grape pie|251|2|36|11|
تارتلت انگور|Grape tartlet|273|3|36|13|
کراستاتا انگور|Grape crostata|259|3|37|11|
کابلر انگور|Grape cobbler|210|1|38|6|
کرامبل انگور|Grape crumble|236|2|39|8|
تارت انگور مینی|Mini grape tart|269|3|35|13|
پای انگور خانگی|Homemade grape pie|243|2|34|11|
پای خرما|Date pie|296|3|44|12|
تارت خرما|Date tart|318|4|44|14|
پای خرما با سقف شبکه‌ای|Lattice date pie|313|3|46|13|
تارتلت خرما|Date tartlet|335|4|46|15|
کراستاتا خرما|Date crostata|321|4|47|13|
کابلر خرما|Date cobbler|272|2|48|8|
کرامبل خرما|Date crumble|298|3|49|10|
تارت خرما مینی|Mini date tart|331|4|45|15|
پای خرما خانگی|Homemade date pie|305|3|44|13|
پای پسته|Pistachio pie|344|5|36|20|
تارت پسته|Pistachio tart|366|6|36|22|
پای پسته با سقف شبکه‌ای|Lattice pistachio pie|361|5|38|21|
تارتلت پسته|Pistachio tartlet|383|6|38|23|
کراستاتا پسته|Pistachio crostata|369|6|39|21|
کابلر پسته|Pistachio cobbler|320|4|40|16|
کرامبل پسته|Pistachio crumble|346|5|41|18|
تارت پسته مینی|Mini pistachio tart|379|6|37|23|
پای پسته خانگی|Homemade pistachio pie|353|5|36|21|
پای بادام|Almond pie|344|5|36|20|
تارت بادام|Almond tart|366|6|36|22|
پای بادام با سقف شبکه‌ای|Lattice almond pie|361|5|38|21|
تارتلت بادام|Almond tartlet|383|6|38|23|
کراستاتا بادام|Almond crostata|369|6|39|21|
کابلر بادام|Almond cobbler|320|4|40|16|
کرامبل بادام|Almond crumble|346|5|41|18|
تارت بادام مینی|Mini almond tart|379|6|37|23|
پای بادام خانگی|Homemade almond pie|353|5|36|21|
پای هویج|Carrot pie|230|3|32|10|
تارت هویج|Carrot tart|252|4|32|12|
پای هویج با سقف شبکه‌ای|Lattice carrot pie|247|3|34|11|
تارتلت هویج|Carrot tartlet|269|4|34|13|
کراستاتا هویج|Carrot crostata|255|4|35|11|
کابلر هویج|Carrot cobbler|206|2|36|6|
کرامبل هویج|Carrot crumble|232|3|37|8|
تارت هویج مینی|Mini carrot tart|265|4|33|13|
پای هویج خانگی|Homemade carrot pie|239|3|32|11|
پای نارنگی|Tangerine pie|234|2|34|10|
تارت نارنگی|Tangerine tart|256|3|34|12|
پای نارنگی با سقف شبکه‌ای|Lattice tangerine pie|251|2|36|11|
تارتلت نارنگی|Tangerine tartlet|273|3|36|13|
کراستاتا نارنگی|Tangerine crostata|259|3|37|11|
کابلر نارنگی|Tangerine cobbler|210|1|38|6|
کرامبل نارنگی|Tangerine crumble|236|2|39|8|
تارت نارنگی مینی|Mini tangerine tart|269|3|35|13|
پای نارنگی خانگی|Homemade tangerine pie|243|2|34|11|
پای کیوی|Kiwi pie|234|2|34|10|
تارت کیوی|Kiwi tart|256|3|34|12|
پای کیوی با سقف شبکه‌ای|Lattice kiwi pie|251|2|36|11|
تارتلت کیوی|Kiwi tartlet|273|3|36|13|
کراستاتا کیوی|Kiwi crostata|259|3|37|11|
کابلر کیوی|Kiwi cobbler|210|1|38|6|
کرامبل کیوی|Kiwi crumble|236|2|39|8|
تارت کیوی مینی|Mini kiwi tart|269|3|35|13|
پای کیوی خانگی|Homemade kiwi pie|243|2|34|11|
پای توت‌سیاه|Blackberry pie|234|2|34|10|
تارت توت‌سیاه|Blackberry tart|256|3|34|12|
پای توت‌سیاه با سقف شبکه‌ای|Lattice blackberry pie|251|2|36|11|
تارتلت توت‌سیاه|Blackberry tartlet|273|3|36|13|
کراستاتا توت‌سیاه|Blackberry crostata|259|3|37|11|
کابلر توت‌سیاه|Blackberry cobbler|210|1|38|6|
کرامبل توت‌سیاه|Blackberry crumble|236|2|39|8|
تارت توت‌سیاه مینی|Mini blackberry tart|269|3|35|13|
پای توت‌سیاه خانگی|Homemade blackberry pie|243|2|34|11|
پای توت‌ها مخلوط|Mixed berry pie|234|2|34|10|
تارت توت‌ها مخلوط|Mixed berry tart|256|3|34|12|
پای توت‌ها مخلوط با سقف شبکه‌ای|Lattice mixed berry pie|251|2|36|11|
تارتلت توت‌ها مخلوط|Mixed berry tartlet|273|3|36|13|
کراستاتا توت‌ها مخلوط|Mixed berry crostata|259|3|37|11|
کابلر توت‌ها مخلوط|Mixed berry cobbler|210|1|38|6|
کرامبل توت‌ها مخلوط|Mixed berry crumble|236|2|39|8|
تارت توت‌ها مخلوط مینی|Mini mixed berry tart|269|3|35|13|
پای توت‌ها مخلوط خانگی|Homemade mixed berry pie|243|2|34|11|
پای کشمش|Raisin pie|262|3|40|10|
تارت کشمش|Raisin tart|284|4|40|12|
پای کشمش با سقف شبکه‌ای|Lattice raisin pie|279|3|42|11|
تارتلت کشمش|Raisin tartlet|301|4|42|13|
کراستاتا کشمش|Raisin crostata|287|4|43|11|
کابلر کشمش|Raisin cobbler|238|2|44|6|
کرامبل کشمش|Raisin crumble|264|3|45|8|
تارت کشمش مینی|Mini raisin tart|297|4|41|13|
پای کشمش خانگی|Homemade raisin pie|271|3|40|11|
پای قهوه|Coffee pie|270|4|32|14|
تارت قهوه|Coffee tart|292|5|32|16|
پای قهوه با سقف شبکه‌ای|Lattice coffee pie|287|4|34|15|
تارتلت قهوه|Coffee tartlet|309|5|34|17|
کراستاتا قهوه|Coffee crostata|295|5|35|15|
کابلر قهوه|Coffee cobbler|246|3|36|10|
کرامبل قهوه|Coffee crumble|272|4|37|12|
تارت قهوه مینی|Mini coffee tart|305|5|33|17|
پای قهوه خانگی|Homemade coffee pie|279|4|32|15|
پای نوتلا|Nutella pie|356|4|40|20|
تارت نوتلا|Nutella tart|378|5|40|22|
پای نوتلا با سقف شبکه‌ای|Lattice Nutella pie|373|4|42|21|
تارتلت نوتلا|Nutella tartlet|395|5|42|23|
کراستاتا نوتلا|Nutella crostata|381|5|43|21|
کابلر نوتلا|Nutella cobbler|332|3|44|16|
کرامبل نوتلا|Nutella crumble|358|4|45|18|
تارت نوتلا مینی|Mini Nutella tart|391|5|41|23|
پای نوتلا خانگی|Homemade Nutella pie|365|4|40|21|
کیش لورن|Quiche Lorraine|310|11|17|22|
کیش اسفناج|Spinach quiche|235|9|16|15|
کیش قارچ|Mushroom quiche|235|9|16|15|
کیش پنیر|Cheese quiche|318|12|18|22|
کیش مرغ|Chicken quiche|256|12|16|16|
کیش سبزیجات|Vegetable quiche|221|8|18|13|
کیش ژامبون|Ham quiche|274|11|17|18|
پای مرغ|Chicken pot pie|237|8|22|13|
پای گوشت|Meat pie|267|9|24|15|
پای میگو|Shrimp pie|232|9|22|12|
پای قارچ|Mushroom pie|224|5|24|12|
پای سیب‌زمینی|Potato pie|228|4|26|12|
پای چوپان|Shepherd's pie|134|8|12|6|
تارت لیمو مرنگ|Lemon meringue tart|282|4|44|10|
تارت تخم‌مرغ پرتغالی|Portuguese egg tart|253|6|28|13|
تارت کرم‌دار میوه‌ای|Fruit custard tart|252|4|32|12|
تارت شکلاتی کارامل|Chocolate caramel tart|356|4|40|20|
بسته‌بندی تارتلت میوه|Packaged fruit tartlet|328|3|52|12|
میلفوی میوه‌ای|Fruit mille-feuille|324|4|32|20|
پای سیب آمریکایی|American apple pie|269|2|36|13|
پای پکان آمریکایی|American pecan pie|426|5|52|22|
پای کدو تنبل آمریکایی|American pumpkin pie|218|4|28|10|
پای لیمو کی لایم|Key lime pie|290|5|36|14|
پای موز کرمی|Banana cream pie|258|3|30|14|
پای کره بادام‌زمینی|Peanut butter pie|376|8|32|24|
پای نارگیل کرمی|Coconut cream pie|306|4|32|18|
پودینگ نارگیلی|Coconut pudding|128|3|20|4|
پودینگ قهوه|Coffee pudding|119|3|20|3|
پودینگ موز|Banana pudding|127|3|22|3|
پودینگ توت‌فرنگی|Strawberry pudding|119|3|20|3|
پودینگ پسته|Pistachio pudding|128|4|19|4|
پودینگ تیرامیسو|Tiramisu pudding|149|4|22|5|
پودینگ ساگو|Sago pudding|139|2|26|3|
پودینگ تاپیوکا|Tapioca pudding|135|3|24|3|
پودینگ نشاسته|Cornstarch pudding|119|3|20|3|
پودینگ شیر و عسل|Milk honey pudding|135|3|24|3|
پودینگ زعفرانی|Saffron pudding|119|3|20|3|
پودینگ گلاب|Rosewater pudding|119|3|20|3|
پودینگ چیا شکلاتی|Chocolate chia pudding|156|5|16|8|
پودینگ چیا انبه|Mango chia pudding|151|4|18|7|
پودینگ چیا نارگیلی|Coconut chia pudding|162|4|14|10|
پودینگ بدون شکر|Sugar-free pudding|70|3|10|2|
پودینگ کم‌چرب|Low-fat pudding|101|3|20|1|
پودینگ کدو حلوایی|Pumpkin pudding|127|3|22|3|
پودینگ دارچین|Cinnamon pudding|119|3|20|3|
پودینگ فندق|Hazelnut pudding|145|3|22|5|
پودینگ آلبالو|Sour cherry pudding|123|3|21|3|
پودینگ لیمو|Lemon pudding|127|3|22|3|
پودینگ نارنگی|Mandarin pudding|123|3|21|3|
پودینگ خرما|Date pudding|143|3|26|3|
پودینگ آرد برنج|Rice flour pudding|119|3|20|3|
پودینگ آجیلی|Nut pudding|172|5|20|8|
پودینگ کاکائو و نارگیل|Cocoa coconut pudding|154|3|22|6|
پودینگ لیوانی آماده|Packaged pudding cup|127|3|22|3|
پودینگ اسفنجی|Sponge pudding|254|5|36|10|
پودینگ سیب|Apple pudding|152|3|26|4|
پودینگ هویج|Carrot pudding|144|3|24|4|
پودینگ انجیر|Fig pudding|143|3|26|3|
پودینگ پرتقال|Orange pudding|127|3|22|3|
موس شکلاتی|Chocolate mousse|332|5|24|24|
موس شکلات سفید|White chocolate mousse|318|4|26|22|
موس توت‌فرنگی|Strawberry mousse|226|3|22|14|
موس انبه|Mango mousse|208|3|22|12|
موس قهوه|Coffee mousse|266|4|22|18|
موس لیمو|Lemon mousse|234|3|24|14|
موس نارگیل|Coconut mousse|262|3|22|18|
موس پسته|Pistachio mousse|288|5|22|20|
موس کارامل|Caramel mousse|260|3|26|16|
موس موز|Banana mousse|216|3|24|12|
موس لوتوس|Lotus mousse|286|3|28|18|
موس آلبالو|Sour cherry mousse|208|3|22|12|
موس وانیل|Vanilla mousse|258|4|20|18|
موس نوتلا|Nutella mousse|348|5|28|24|
موس هلو|Peach mousse|208|3|22|12|
موس فندق|Hazelnut mousse|332|5|24|24|
موس بدون شکر|Sugar-free mousse|214|5|8|18|
موس آووکادو|Avocado mousse|226|3|22|14|
موس زعفران|Saffron mousse|258|4|20|18|
موس گلاب|Rose mousse|226|3|22|14|
پاناکوتا|Panna cotta|262|3|22|18|
پاناکوتا توت‌فرنگی|Strawberry panna cotta|252|3|24|16|
پاناکوتا شکلاتی|Chocolate panna cotta|274|4|24|18|
پاناکوتا کارامل|Caramel panna cotta|260|3|26|16|
پاناکوتا قهوه|Coffee panna cotta|253|3|22|17|
پاناکوتا نارگیل|Coconut panna cotta|262|3|22|18|
پاناکوتا پسته|Pistachio panna cotta|266|4|22|18|
پاناکوتا انبه|Mango panna cotta|243|3|24|15|
پاناکوتا زعفران|Saffron panna cotta|253|3|22|17|
کرم بروله|Creme brulee|306|5|22|22|
کرم کارامل شکلاتی|Chocolate flan|205|5|26|9|
فلان|Flan|188|5|24|8|
فلان نارگیل|Coconut flan|206|5|24|10|
فلان قهوه|Coffee flan|192|5|25|8|
کاستارد وانیلی|Vanilla custard|124|4|18|4|
کاستارد شکلاتی|Chocolate custard|141|4|20|5|
کاستارد تخم‌مرغی|Egg custard|129|5|16|5|
کاستارد میوه‌ای|Fruit custard|119|3|20|3|
ژله ساده|Plain jelly|82|1.5|19|0|ژله
ژله توت‌فرنگی|Strawberry jelly|82|1.5|19|0|
ژله پرتقال|Orange jelly|82|1.5|19|0|
ژله آلبالو|Cherry jelly|82|1.5|19|0|
ژله لیمو|Lemon jelly|82|1.5|19|0|
ژله آناناس|Pineapple jelly|82|1.5|19|0|
ژله هلو|Peach jelly|82|1.5|19|0|
ژله انگور|Grape jelly dessert|82|1.5|19|0|
ژله هندوانه|Watermelon jelly|82|1.5|19|0|
ژله انبه|Mango jelly|82|1.5|19|0|
ژله تمشک|Raspberry jelly|82|1.5|19|0|
ژله بدون شکر|Sugar-free jelly|12|2|1|0|
ژله شیری|Milk jelly|102|3|18|2|
ژله دو رنگ|Two-color jelly|82|1.5|19|0|
ژله گل‌دار|Flower jelly|82|1.5|19|0|
ژله لایه‌ای|Layered jelly|93|2|19|1|
ژله قالبی|Molded jelly|82|1.5|19|0|
ژله پروتئینی|Protein jelly|56|8|6|0|
ژله کیوی|Kiwi jelly|82|1.5|19|0|
ژله گیلاس|Cherry jelly dessert|82|1.5|19|0|
ژله پودری آماده|Prepared jelly from powder|82|1.5|19|0|
ژله با خامه|Jelly with cream|151|2|20|7|
ژله با ماست|Jelly with yogurt|102|3|18|2|
دسر لیوانی شکلاتی|Chocolate dessert cup|210|4|26|10|
دسر لیوانی میوه‌ای|Fruit dessert cup|162|3|24|6|
دسر لیوانی بیسکویتی|Biscuit dessert cup|244|4|30|12|
دسر لیوانی تیرامیسو|Tiramisu dessert cup|266|5|30|14|
دسر لیوانی کارامل|Caramel dessert cup|218|4|28|10|
دسر لیوانی پسته|Pistachio dessert cup|232|5|26|12|
دسر لیوانی نارگیل|Coconut dessert cup|228|4|26|12|
دسر لیوانی توت‌فرنگی|Strawberry dessert cup|201|4|26|9|
دسر لیوانی لوتوس|Lotus dessert cup|261|4|32|13|
دسر لیوانی اوریو|Oreo dessert cup|261|4|32|13|
دسر لیوانی موز و شکلات|Banana chocolate dessert cup|218|4|28|10|
دسر لیوانی قهوه|Coffee dessert cup|236|4|28|12|
دسر لیوانی نوتلا|Nutella dessert cup|266|5|30|14|
دسر لیوانی ماست|Yogurt dessert cup|153|5|22|5|
دسر لیوانی خامه|Cream dessert cup|226|3|22|14|
دسر لیوانی انبه|Mango dessert cup|188|3|26|8|
دسر لیوانی ردولوت|Red velvet dessert cup|244|4|30|12|
دسر لیوانی فندقی|Hazelnut dessert cup|258|5|28|14|
دسر لیوانی چیزکیک|Cheesecake dessert cup|250|5|26|14|
دسر لیوانی لیمویی|Lemon dessert cup|218|4|28|10|
دسر ماست و گرانولا|Yogurt granola dessert|165|6|24|5|
دسر ماست و عسل|Yogurt honey dessert|135|5|22|3|
دسر شیر و پسته|Milk pistachio dessert|150|4|20|6|
دسر شیر و نارگیل|Milk coconut dessert|154|3|22|6|
دسر آلبالویی|Sour cherry dessert|153|3|24|5|
دسر خرمایی|Date dessert|186|3|30|6|
دسر نان و شیر|Bread milk dessert|212|5|30|8|
دسر گلابی|Pear dessert|148|2|26|4|
دسر سیب پخته|Baked apple dessert|135|1|26|3|
سیب پخته با دارچین|Baked apple with cinnamon|94|0.5|22|0.5|
موز کاراملی|Caramelized banana|152|1|28|4|
آناناس کاراملی|Caramelized pineapple|124|0.5|26|2|
توت‌فرنگی با خامه|Strawberries with cream|163|1.5|10|13|
توت‌فرنگی شکلاتی|Chocolate strawberries|232|3|28|12|
موز شکلاتی|Chocolate banana|222|3|30|10|
میوه فوندو|Fruit fondue|208|3|22|12|
فوندو شکلات|Chocolate fondue|490|5|50|30|
سالاد میوه با بستنی|Fruit salad with ice cream|105|1.5|18|3|
سالاد میوه با خامه|Fruit salad with cream|133|1.5|16|7|
سالاد میوه ساده|Plain fruit salad|58|0.8|13|0.3|
ماسدونیا|Macedonia|61|0.8|14|0.2|
پاولووا|Pavlova|274|3|52|6|
مرنگ|Meringue|336|4|80|0|
مرنگ شکلاتی|Chocolate meringue|340|4|72|4|
مرنگ نارگیلی|Coconut meringue|350|4|70|6|
ماکارون|Macaron|470|8|60|22|
ماکارون پسته|Pistachio macaron|480|8|58|24|
ماکارون شکلاتی|Chocolate macaron|480|8|58|24|
ماکارون توت‌فرنگی|Strawberry macaron|470|8|60|22|
ماکارون وانیلی|Vanilla macaron|470|8|60|22|
ماکارون کارامل|Caramel macaron|478|8|62|22|
ماکارون لیمو|Lemon macaron|470|8|60|22|
ماکارون فندق|Hazelnut macaron|493|9|58|25|
ماکارون قهوه|Coffee macaron|470|8|60|22|
ماکارون گلاب|Rose macaron|470|8|60|22|
ماکارون نارگیل|Coconut macaron|480|8|58|24|
ماکارون زعفران|Saffron macaron|470|8|60|22|
ماکارون لوتوس|Lotus macaron|478|8|62|22|
ماکارون نوتلا|Nutella macaron|488|8|60|24|
برانی|Brownie|444|5|52|24|براونی
براونی گردویی|Walnut brownie|468|6|48|28|
براونی کره بادام‌زمینی|Peanut butter brownie|476|8|48|28|
براونی بدون آرد|Flourless brownie|444|6|42|28|
براونی ختمی|Marshmallow brownie|442|5|56|22|
براونی کم‌شیرین|Reduced sugar brownie|382|6|40|22|
براونی کارامل|Caramel brownie|452|5|54|24|
براونی پسته|Pistachio brownie|454|7|48|26|
براونی نارگیل|Coconut brownie|454|5|50|26|
براونی بدون گلوتن|Gluten-free brownie|440|6|50|24|
براونی فاج|Fudgy brownie|452|5|54|24|
براونی با بستنی|Brownie with ice cream|392|5|48|20|
بلوندی|Blondie|440|5|60|20|
بلوندی شکلات سفید|White chocolate blondie|448|5|62|20|
بلوندی کارامل|Caramel blondie|448|5|62|20|
بلوندی گردو|Walnut blondie|464|6|56|24|
شیرینی لیمو|Lemon bar|382|4|60|14|
بار جو دوسر|Oat bar|408|6|60|16|
بار گرانولا شکلاتی|Chocolate granola bar|420|7|62|16|
بار پروتئینی|Protein bar|388|30|40|12|
بار پروتئینی شکلاتی|Chocolate protein bar|398|30|38|14|
بار پروتئینی کره بادام‌زمینی|Peanut butter protein bar|408|30|36|16|
بار پروتئینی کارامل|Caramel protein bar|388|30|40|12|
بار انرژی خرما|Date energy bar|396|8|64|12|
بار انرژی آجیلی|Nut energy bar|472|12|52|24|
بار میوه‌ای|Fruit bar|366|2|76|6|
بار نارگیلی|Coconut bar|504|4|50|32|
بار شکلات نارگیل|Chocolate coconut bar|510|4|56|30|
بار کره بادام‌زمینی|Peanut butter bar|510|14|46|30|
بار دانه‌ای|Seed bar|492|12|48|28|
بار عسل و بادام|Honey almond bar|458|9|56|22|
بار کرانچی|Crunchy bar|442|8|62|18|
بار توت و آجیل|Berry nut bar|434|8|60|18|
بستنی پسته|Pistachio ice cream|238|5|23|14|
بستنی کارامل|Caramel ice cream|221|3.5|27|11|
بستنی نارگیل|Coconut ice cream|232|3.5|23|14|
بستنی موز|Banana ice cream|208|3.5|26|10|
بستنی فندق|Hazelnut ice cream|240|4.5|24|14|
بستنی بادام|Almond ice cream|236|4.5|23|14|
بستنی آلبالو|Sour cherry ice cream|208|3.5|26|10|
بستنی انبه|Mango ice cream|208|3.5|26|10|
بستنی لیمو|Lemon ice cream|199|3.5|26|9|
بستنی هل|Cardamom ice cream|205|3.5|23|11|
بستنی گلاب|Rose ice cream|205|3.5|23|11|
بستنی عسل|Honey ice cream|217|3.5|26|11|
بستنی دارچین|Cinnamon ice cream|209|3.5|24|11|
بستنی نوتلا|Nutella ice cream|256|4.5|28|14|
بستنی کوکی و کرم|Cookies and cream ice cream|234|4.5|27|12|
بستنی نعناع شکلاتی|Mint chocolate ice cream|228|4|26|12|
بستنی لوتوس|Lotus biscuit ice cream|236|4|28|12|
بستنی بلوبری|Blueberry ice cream|204|3.5|25|10|
بستنی هلو|Peach ice cream|204|3.5|25|10|
بستنی تمشک|Raspberry ice cream|204|3.5|25|10|
بستنی گیلاس|Cherry ice cream|204|3.5|25|10|
بستنی کیوی|Kiwi ice cream|195|3.5|25|9|
بستنی آناناس|Pineapple ice cream|199|3.5|26|9|
بستنی پرتقال|Orange ice cream|199|3.5|26|9|
بستنی خرما|Date ice cream|233|4.5|29|11|
بستنی تیرامیسو|Tiramisu ice cream|239|4.5|26|13|
بستنی رد ولوت|Red velvet ice cream|241|4|27|13|
بستنی چیزکیک|Cheesecake ice cream|248|4.5|26|14|
بستنی مارشمالو|Marshmallow ice cream|229|3.5|29|11|
بستنی پاپ‌کورن کاراملی|Caramel popcorn ice cream|238|4.5|28|12|
بستنی شکلات سفید|White chocolate ice cream|241|4|27|13|
بستنی شکلات تلخ|Dark chocolate ice cream|227|4.5|23|13|
بستنی ماچا|Matcha ice cream|211|4|24|11|
بستنی آووکادو|Avocado ice cream|223|3.5|23|13|
بستنی گردو|Walnut ice cream|236|4.5|23|14|
بستنی انجیر|Fig ice cream|221|3.5|27|11|
بستنی هندوانه|Watermelon ice cream|195|3.5|25|9|
بستنی طالبی|Cantaloupe ice cream|195|3.5|25|9|
بستنی سیب|Apple ice cream|199|3.5|26|9|
بستنی انار|Pomegranate ice cream|199|3.5|26|9|
بستنی زردآلو|Apricot ice cream|204|3.5|25|10|
بستنی بیسکویت|Biscuit ice cream|234|4.5|27|12|
بستنی سنتی وانیلی|Vanilla traditional ice cream|192|3.5|22|10|
بستنی سنتی شکلاتی|Chocolate traditional ice cream|215|4|25|11|
بستنی سنتی توت‌فرنگی|Strawberry traditional ice cream|191|3.5|24|9|
بستنی سنتی قهوه|Coffee traditional ice cream|196|3.5|23|10|
بستنی سنتی پسته|Pistachio traditional ice cream|225|5|22|13|
بستنی سنتی کارامل|Caramel traditional ice cream|208|3.5|26|10|
بستنی سنتی نارگیل|Coconut traditional ice cream|219|3.5|22|13|
بستنی سنتی موز|Banana traditional ice cream|195|3.5|25|9|
بستنی سنتی فندق|Hazelnut traditional ice cream|227|4.5|23|13|
بستنی سنتی بادام|Almond traditional ice cream|223|4.5|22|13|
بستنی سنتی آلبالو|Sour cherry traditional ice cream|195|3.5|25|9|
بستنی سنتی انبه|Mango traditional ice cream|195|3.5|25|9|
بستنی سنتی لیمو|Lemon traditional ice cream|186|3.5|25|8|
بستنی سنتی هل|Cardamom traditional ice cream|192|3.5|22|10|
بستنی سنتی گلاب|Rose traditional ice cream|192|3.5|22|10|
بستنی سنتی عسل|Honey traditional ice cream|204|3.5|25|10|
بستنی سنتی دارچین|Cinnamon traditional ice cream|196|3.5|23|10|
بستنی سنتی نوتلا|Nutella traditional ice cream|243|4.5|27|13|
بستنی سنتی کوکی و کرم|Cookies and cream traditional ice cream|221|4.5|26|11|
بستنی سنتی نعناع شکلاتی|Mint chocolate traditional ice cream|215|4|25|11|
بستنی سنتی لوتوس|Lotus biscuit traditional ice cream|223|4|27|11|
بستنی سنتی بلوبری|Blueberry traditional ice cream|191|3.5|24|9|
بستنی سنتی هلو|Peach traditional ice cream|191|3.5|24|9|
بستنی سنتی تمشک|Raspberry traditional ice cream|191|3.5|24|9|
بستنی سنتی گیلاس|Cherry traditional ice cream|191|3.5|24|9|
بستنی سنتی کیوی|Kiwi traditional ice cream|182|3.5|24|8|
بستنی سنتی آناناس|Pineapple traditional ice cream|186|3.5|25|8|
بستنی سنتی پرتقال|Orange traditional ice cream|186|3.5|25|8|
بستنی سنتی خرما|Date traditional ice cream|220|4.5|28|10|
بستنی سنتی کره بادام‌زمینی|Peanut butter traditional ice cream|248|6.5|24|14|
بستنی سنتی تیرامیسو|Tiramisu traditional ice cream|226|4.5|25|12|
بستنی سنتی رد ولوت|Red velvet traditional ice cream|228|4|26|12|
بستنی سنتی چیزکیک|Cheesecake traditional ice cream|235|4.5|25|13|
بستنی سنتی مارشمالو|Marshmallow traditional ice cream|216|3.5|28|10|
بستنی سنتی پاپ‌کورن کاراملی|Caramel popcorn traditional ice cream|225|4.5|27|11|
بستنی سنتی شکلات سفید|White chocolate traditional ice cream|228|4|26|12|
بستنی سنتی شکلات تلخ|Dark chocolate traditional ice cream|214|4.5|22|12|
بستنی سنتی ماچا|Matcha traditional ice cream|198|4|23|10|
بستنی سنتی آووکادو|Avocado traditional ice cream|210|3.5|22|12|
بستنی سنتی گردو|Walnut traditional ice cream|223|4.5|22|13|
بستنی سنتی انجیر|Fig traditional ice cream|208|3.5|26|10|
بستنی سنتی هندوانه|Watermelon traditional ice cream|182|3.5|24|8|
بستنی سنتی طالبی|Cantaloupe traditional ice cream|182|3.5|24|8|
بستنی سنتی سیب|Apple traditional ice cream|186|3.5|25|8|
بستنی سنتی انار|Pomegranate traditional ice cream|186|3.5|25|8|
بستنی سنتی زردآلو|Apricot traditional ice cream|191|3.5|24|9|
بستنی سنتی شیر و عسل|Milk and honey traditional ice cream|200|3.5|24|10|
بستنی سنتی چای|Tea traditional ice cream|196|3.5|23|10|
بستنی سنتی بیسکویت|Biscuit traditional ice cream|221|4.5|26|11|
بستنی ژلاتو وانیلی|Vanilla gelato|182|3.5|24|8|
بستنی ژلاتو شکلاتی|Chocolate gelato|205|4|27|9|
بستنی ژلاتو توت‌فرنگی|Strawberry gelato|181|3.5|26|7|
بستنی ژلاتو قهوه|Coffee gelato|186|3.5|25|8|
بستنی ژلاتو پسته|Pistachio gelato|215|5|24|11|
بستنی ژلاتو زعفرانی|Saffron gelato|182|3.5|24|8|
بستنی ژلاتو کارامل|Caramel gelato|198|3.5|28|8|
بستنی ژلاتو نارگیل|Coconut gelato|209|3.5|24|11|
بستنی ژلاتو موز|Banana gelato|185|3.5|27|7|
بستنی ژلاتو فندق|Hazelnut gelato|217|4.5|25|11|
بستنی ژلاتو بادام|Almond gelato|213|4.5|24|11|
بستنی ژلاتو آلبالو|Sour cherry gelato|185|3.5|27|7|
بستنی ژلاتو انبه|Mango gelato|185|3.5|27|7|
بستنی ژلاتو لیمو|Lemon gelato|176|3.5|27|6|
بستنی ژلاتو هل|Cardamom gelato|182|3.5|24|8|
بستنی ژلاتو گلاب|Rose gelato|182|3.5|24|8|
بستنی ژلاتو عسل|Honey gelato|194|3.5|27|8|
بستنی ژلاتو دارچین|Cinnamon gelato|186|3.5|25|8|
بستنی ژلاتو نوتلا|Nutella gelato|233|4.5|29|11|
بستنی ژلاتو کوکی و کرم|Cookies and cream gelato|211|4.5|28|9|
بستنی ژلاتو نعناع شکلاتی|Mint chocolate gelato|205|4|27|9|
بستنی ژلاتو لوتوس|Lotus biscuit gelato|213|4|29|9|
بستنی ژلاتو بلوبری|Blueberry gelato|181|3.5|26|7|
بستنی ژلاتو هلو|Peach gelato|181|3.5|26|7|
بستنی ژلاتو تمشک|Raspberry gelato|181|3.5|26|7|
بستنی ژلاتو گیلاس|Cherry gelato|181|3.5|26|7|
بستنی ژلاتو کیوی|Kiwi gelato|172|3.5|26|6|
بستنی ژلاتو آناناس|Pineapple gelato|176|3.5|27|6|
بستنی ژلاتو پرتقال|Orange gelato|176|3.5|27|6|
بستنی ژلاتو خرما|Date gelato|210|4.5|30|8|
بستنی ژلاتو کره بادام‌زمینی|Peanut butter gelato|238|6.5|26|12|
بستنی ژلاتو تیرامیسو|Tiramisu gelato|216|4.5|27|10|
بستنی ژلاتو رد ولوت|Red velvet gelato|218|4|28|10|
بستنی ژلاتو چیزکیک|Cheesecake gelato|225|4.5|27|11|
بستنی ژلاتو مارشمالو|Marshmallow gelato|206|3.5|30|8|
بستنی ژلاتو پاپ‌کورن کاراملی|Caramel popcorn gelato|215|4.5|29|9|
بستنی ژلاتو شکلات سفید|White chocolate gelato|218|4|28|10|
بستنی ژلاتو شکلات تلخ|Dark chocolate gelato|204|4.5|24|10|
بستنی ژلاتو ماچا|Matcha gelato|188|4|25|8|
بستنی ژلاتو آووکادو|Avocado gelato|200|3.5|24|10|
بستنی ژلاتو گردو|Walnut gelato|213|4.5|24|11|
بستنی ژلاتو انجیر|Fig gelato|198|3.5|28|8|
بستنی ژلاتو هندوانه|Watermelon gelato|172|3.5|26|6|
بستنی ژلاتو طالبی|Cantaloupe gelato|172|3.5|26|6|
بستنی ژلاتو سیب|Apple gelato|176|3.5|27|6|
بستنی ژلاتو انار|Pomegranate gelato|176|3.5|27|6|
بستنی ژلاتو زردآلو|Apricot gelato|181|3.5|26|7|
بستنی ژلاتو شیر و عسل|Milk and honey gelato|190|3.5|26|8|
بستنی ژلاتو چای|Tea gelato|186|3.5|25|8|
بستنی ژلاتو بیسکویت|Biscuit gelato|211|4.5|28|9|
بستنی نرم وانیلی|Vanilla soft serve|147|3.5|22|5|
بستنی نرم شکلاتی|Chocolate soft serve|170|4|25|6|
بستنی نرم توت‌فرنگی|Strawberry soft serve|146|3.5|24|4|
بستنی نرم قهوه|Coffee soft serve|151|3.5|23|5|
بستنی نرم پسته|Pistachio soft serve|180|5|22|8|
بستنی نرم زعفرانی|Saffron soft serve|147|3.5|22|5|
بستنی نرم کارامل|Caramel soft serve|163|3.5|26|5|
بستنی نرم نارگیل|Coconut soft serve|174|3.5|22|8|
بستنی نرم موز|Banana soft serve|150|3.5|25|4|
بستنی نرم فندق|Hazelnut soft serve|182|4.5|23|8|
بستنی نرم بادام|Almond soft serve|178|4.5|22|8|
بستنی نرم آلبالو|Sour cherry soft serve|150|3.5|25|4|
بستنی نرم انبه|Mango soft serve|150|3.5|25|4|
بستنی نرم لیمو|Lemon soft serve|141|3.5|25|3|
بستنی نرم هل|Cardamom soft serve|147|3.5|22|5|
بستنی نرم گلاب|Rose soft serve|147|3.5|22|5|
بستنی نرم عسل|Honey soft serve|159|3.5|25|5|
بستنی نرم دارچین|Cinnamon soft serve|151|3.5|23|5|
بستنی نرم نوتلا|Nutella soft serve|198|4.5|27|8|
بستنی نرم کوکی و کرم|Cookies and cream soft serve|176|4.5|26|6|
بستنی نرم نعناع شکلاتی|Mint chocolate soft serve|170|4|25|6|
بستنی نرم لوتوس|Lotus biscuit soft serve|178|4|27|6|
بستنی نرم بلوبری|Blueberry soft serve|146|3.5|24|4|
بستنی نرم هلو|Peach soft serve|146|3.5|24|4|
بستنی نرم تمشک|Raspberry soft serve|146|3.5|24|4|
بستنی نرم گیلاس|Cherry soft serve|146|3.5|24|4|
بستنی نرم کیوی|Kiwi soft serve|137|3.5|24|3|
بستنی نرم آناناس|Pineapple soft serve|141|3.5|25|3|
بستنی نرم پرتقال|Orange soft serve|141|3.5|25|3|
بستنی نرم خرما|Date soft serve|175|4.5|28|5|
بستنی نرم کره بادام‌زمینی|Peanut butter soft serve|203|6.5|24|9|
بستنی نرم تیرامیسو|Tiramisu soft serve|181|4.5|25|7|
بستنی نرم رد ولوت|Red velvet soft serve|183|4|26|7|
بستنی نرم چیزکیک|Cheesecake soft serve|190|4.5|25|8|
بستنی نرم مارشمالو|Marshmallow soft serve|171|3.5|28|5|
بستنی نرم پاپ‌کورن کاراملی|Caramel popcorn soft serve|180|4.5|27|6|
بستنی نرم شکلات سفید|White chocolate soft serve|183|4|26|7|
بستنی نرم شکلات تلخ|Dark chocolate soft serve|169|4.5|22|7|
بستنی نرم ماچا|Matcha soft serve|153|4|23|5|
بستنی نرم آووکادو|Avocado soft serve|165|3.5|22|7|
بستنی نرم گردو|Walnut soft serve|178|4.5|22|8|
بستنی نرم انجیر|Fig soft serve|163|3.5|26|5|
بستنی نرم هندوانه|Watermelon soft serve|137|3.5|24|3|
بستنی نرم طالبی|Cantaloupe soft serve|137|3.5|24|3|
بستنی نرم سیب|Apple soft serve|141|3.5|25|3|
بستنی نرم انار|Pomegranate soft serve|141|3.5|25|3|
بستنی نرم زردآلو|Apricot soft serve|146|3.5|24|4|
بستنی نرم شیر و عسل|Milk and honey soft serve|155|3.5|24|5|
بستنی نرم چای|Tea soft serve|151|3.5|23|5|
بستنی نرم بیسکویت|Biscuit soft serve|176|4.5|26|6|
بستنی کم‌چرب وانیلی|Vanilla low-fat ice cream|131|4|22|3|
بستنی کم‌چرب شکلاتی|Chocolate low-fat ice cream|154|4.5|25|4|
بستنی کم‌چرب توت‌فرنگی|Strawberry low-fat ice cream|130|4|24|2|
بستنی کم‌چرب قهوه|Coffee low-fat ice cream|135|4|23|3|
بستنی کم‌چرب پسته|Pistachio low-fat ice cream|164|5.5|22|6|
بستنی کم‌چرب زعفرانی|Saffron low-fat ice cream|131|4|22|3|
بستنی کم‌چرب کارامل|Caramel low-fat ice cream|147|4|26|3|
بستنی کم‌چرب نارگیل|Coconut low-fat ice cream|158|4|22|6|
بستنی کم‌چرب موز|Banana low-fat ice cream|134|4|25|2|
بستنی کم‌چرب فندق|Hazelnut low-fat ice cream|166|5|23|6|
بستنی کم‌چرب بادام|Almond low-fat ice cream|162|5|22|6|
بستنی کم‌چرب آلبالو|Sour cherry low-fat ice cream|134|4|25|2|
بستنی کم‌چرب انبه|Mango low-fat ice cream|134|4|25|2|
بستنی کم‌چرب لیمو|Lemon low-fat ice cream|125|4|25|1|
بستنی کم‌چرب هل|Cardamom low-fat ice cream|131|4|22|3|
بستنی کم‌چرب گلاب|Rose low-fat ice cream|131|4|22|3|
بستنی کم‌چرب عسل|Honey low-fat ice cream|143|4|25|3|
بستنی کم‌چرب دارچین|Cinnamon low-fat ice cream|135|4|23|3|
بستنی کم‌چرب نوتلا|Nutella low-fat ice cream|182|5|27|6|
بستنی کم‌چرب کوکی و کرم|Cookies and cream low-fat ice cream|160|5|26|4|
بستنی کم‌چرب نعناع شکلاتی|Mint chocolate low-fat ice cream|154|4.5|25|4|
بستنی کم‌چرب لوتوس|Lotus biscuit low-fat ice cream|162|4.5|27|4|
بستنی کم‌چرب بلوبری|Blueberry low-fat ice cream|130|4|24|2|
بستنی کم‌چرب هلو|Peach low-fat ice cream|130|4|24|2|
بستنی کم‌چرب تمشک|Raspberry low-fat ice cream|130|4|24|2|
بستنی کم‌چرب گیلاس|Cherry low-fat ice cream|130|4|24|2|
بستنی کم‌چرب کیوی|Kiwi low-fat ice cream|121|4|24|1|
بستنی کم‌چرب آناناس|Pineapple low-fat ice cream|125|4|25|1|
بستنی کم‌چرب پرتقال|Orange low-fat ice cream|125|4|25|1|
بستنی کم‌چرب خرما|Date low-fat ice cream|159|5|28|3|
بستنی کم‌چرب کره بادام‌زمینی|Peanut butter low-fat ice cream|187|7|24|7|
بستنی کم‌چرب تیرامیسو|Tiramisu low-fat ice cream|165|5|25|5|
بستنی کم‌چرب رد ولوت|Red velvet low-fat ice cream|167|4.5|26|5|
بستنی کم‌چرب چیزکیک|Cheesecake low-fat ice cream|174|5|25|6|
بستنی کم‌چرب مارشمالو|Marshmallow low-fat ice cream|155|4|28|3|
بستنی کم‌چرب پاپ‌کورن کاراملی|Caramel popcorn low-fat ice cream|164|5|27|4|
بستنی کم‌چرب شکلات سفید|White chocolate low-fat ice cream|167|4.5|26|5|
بستنی کم‌چرب شکلات تلخ|Dark chocolate low-fat ice cream|153|5|22|5|
بستنی کم‌چرب ماچا|Matcha low-fat ice cream|137|4.5|23|3|
بستنی کم‌چرب آووکادو|Avocado low-fat ice cream|149|4|22|5|
بستنی کم‌چرب گردو|Walnut low-fat ice cream|162|5|22|6|
بستنی کم‌چرب انجیر|Fig low-fat ice cream|147|4|26|3|
بستنی کم‌چرب هندوانه|Watermelon low-fat ice cream|121|4|24|1|
بستنی کم‌چرب طالبی|Cantaloupe low-fat ice cream|121|4|24|1|
بستنی کم‌چرب سیب|Apple low-fat ice cream|125|4|25|1|
بستنی کم‌چرب انار|Pomegranate low-fat ice cream|125|4|25|1|
بستنی کم‌چرب زردآلو|Apricot low-fat ice cream|130|4|24|2|
بستنی کم‌چرب شیر و عسل|Milk and honey low-fat ice cream|139|4|24|3|
بستنی کم‌چرب چای|Tea low-fat ice cream|135|4|23|3|
بستنی کم‌چرب بیسکویت|Biscuit low-fat ice cream|160|5|26|4|
بستنی بدون شکر وانیلی|Vanilla sugar-free ice cream|126|4|14|6|
بستنی بدون شکر شکلاتی|Chocolate sugar-free ice cream|149|4.5|17|7|
بستنی بدون شکر توت‌فرنگی|Strawberry sugar-free ice cream|125|4|16|5|
بستنی بدون شکر قهوه|Coffee sugar-free ice cream|130|4|15|6|
بستنی بدون شکر پسته|Pistachio sugar-free ice cream|159|5.5|14|9|
بستنی بدون شکر زعفرانی|Saffron sugar-free ice cream|126|4|14|6|
بستنی بدون شکر کارامل|Caramel sugar-free ice cream|142|4|18|6|
بستنی بدون شکر نارگیل|Coconut sugar-free ice cream|153|4|14|9|
بستنی بدون شکر موز|Banana sugar-free ice cream|129|4|17|5|
بستنی بدون شکر فندق|Hazelnut sugar-free ice cream|161|5|15|9|
بستنی بدون شکر بادام|Almond sugar-free ice cream|157|5|14|9|
بستنی بدون شکر آلبالو|Sour cherry sugar-free ice cream|129|4|17|5|
بستنی بدون شکر انبه|Mango sugar-free ice cream|129|4|17|5|
بستنی بدون شکر لیمو|Lemon sugar-free ice cream|120|4|17|4|
بستنی بدون شکر هل|Cardamom sugar-free ice cream|126|4|14|6|
بستنی بدون شکر گلاب|Rose sugar-free ice cream|126|4|14|6|
بستنی بدون شکر عسل|Honey sugar-free ice cream|138|4|17|6|
بستنی بدون شکر دارچین|Cinnamon sugar-free ice cream|130|4|15|6|
بستنی بدون شکر نوتلا|Nutella sugar-free ice cream|177|5|19|9|
بستنی بدون شکر کوکی و کرم|Cookies and cream sugar-free ice cream|155|5|18|7|
بستنی بدون شکر نعناع شکلاتی|Mint chocolate sugar-free ice cream|149|4.5|17|7|
بستنی بدون شکر لوتوس|Lotus biscuit sugar-free ice cream|157|4.5|19|7|
بستنی بدون شکر بلوبری|Blueberry sugar-free ice cream|125|4|16|5|
بستنی بدون شکر هلو|Peach sugar-free ice cream|125|4|16|5|
بستنی بدون شکر تمشک|Raspberry sugar-free ice cream|125|4|16|5|
بستنی بدون شکر گیلاس|Cherry sugar-free ice cream|125|4|16|5|
بستنی بدون شکر کیوی|Kiwi sugar-free ice cream|116|4|16|4|
بستنی بدون شکر آناناس|Pineapple sugar-free ice cream|120|4|17|4|
بستنی بدون شکر پرتقال|Orange sugar-free ice cream|120|4|17|4|
بستنی بدون شکر خرما|Date sugar-free ice cream|154|5|20|6|
بستنی بدون شکر کره بادام‌زمینی|Peanut butter sugar-free ice cream|182|7|16|10|
بستنی بدون شکر تیرامیسو|Tiramisu sugar-free ice cream|160|5|17|8|
بستنی بدون شکر رد ولوت|Red velvet sugar-free ice cream|162|4.5|18|8|
بستنی بدون شکر چیزکیک|Cheesecake sugar-free ice cream|169|5|17|9|
بستنی بدون شکر مارشمالو|Marshmallow sugar-free ice cream|150|4|20|6|
بستنی بدون شکر پاپ‌کورن کاراملی|Caramel popcorn sugar-free ice cream|159|5|19|7|
بستنی بدون شکر شکلات سفید|White chocolate sugar-free ice cream|162|4.5|18|8|
بستنی بدون شکر شکلات تلخ|Dark chocolate sugar-free ice cream|148|5|14|8|
بستنی بدون شکر ماچا|Matcha sugar-free ice cream|132|4.5|15|6|
بستنی بدون شکر آووکادو|Avocado sugar-free ice cream|144|4|14|8|
بستنی بدون شکر گردو|Walnut sugar-free ice cream|157|5|14|9|
بستنی بدون شکر انجیر|Fig sugar-free ice cream|142|4|18|6|
بستنی بدون شکر هندوانه|Watermelon sugar-free ice cream|116|4|16|4|
بستنی بدون شکر طالبی|Cantaloupe sugar-free ice cream|116|4|16|4|
بستنی بدون شکر سیب|Apple sugar-free ice cream|120|4|17|4|
بستنی بدون شکر انار|Pomegranate sugar-free ice cream|120|4|17|4|
بستنی بدون شکر زردآلو|Apricot sugar-free ice cream|125|4|16|5|
بستنی بدون شکر شیر و عسل|Milk and honey sugar-free ice cream|134|4|16|6|
بستنی بدون شکر چای|Tea sugar-free ice cream|130|4|15|6|
بستنی بدون شکر بیسکویت|Biscuit sugar-free ice cream|155|5|18|7|
بستنی پروتئینی وانیلی|Vanilla protein ice cream|123|8|16|3|
بستنی پروتئینی شکلاتی|Chocolate protein ice cream|146|8.5|19|4|
بستنی پروتئینی توت‌فرنگی|Strawberry protein ice cream|122|8|18|2|
بستنی پروتئینی قهوه|Coffee protein ice cream|127|8|17|3|
بستنی پروتئینی پسته|Pistachio protein ice cream|156|9.5|16|6|
بستنی پروتئینی زعفرانی|Saffron protein ice cream|123|8|16|3|
بستنی پروتئینی کارامل|Caramel protein ice cream|139|8|20|3|
بستنی پروتئینی نارگیل|Coconut protein ice cream|150|8|16|6|
بستنی پروتئینی موز|Banana protein ice cream|126|8|19|2|
بستنی پروتئینی فندق|Hazelnut protein ice cream|158|9|17|6|
بستنی پروتئینی بادام|Almond protein ice cream|154|9|16|6|
بستنی پروتئینی آلبالو|Sour cherry protein ice cream|126|8|19|2|
بستنی پروتئینی انبه|Mango protein ice cream|126|8|19|2|
بستنی پروتئینی لیمو|Lemon protein ice cream|117|8|19|1|
بستنی پروتئینی هل|Cardamom protein ice cream|123|8|16|3|
بستنی پروتئینی گلاب|Rose protein ice cream|123|8|16|3|
بستنی پروتئینی عسل|Honey protein ice cream|135|8|19|3|
بستنی پروتئینی دارچین|Cinnamon protein ice cream|127|8|17|3|
بستنی پروتئینی نوتلا|Nutella protein ice cream|174|9|21|6|
بستنی پروتئینی کوکی و کرم|Cookies and cream protein ice cream|152|9|20|4|
بستنی پروتئینی نعناع شکلاتی|Mint chocolate protein ice cream|146|8.5|19|4|
بستنی پروتئینی لوتوس|Lotus biscuit protein ice cream|154|8.5|21|4|
بستنی پروتئینی بلوبری|Blueberry protein ice cream|122|8|18|2|
بستنی پروتئینی هلو|Peach protein ice cream|122|8|18|2|
بستنی پروتئینی تمشک|Raspberry protein ice cream|122|8|18|2|
بستنی پروتئینی گیلاس|Cherry protein ice cream|122|8|18|2|
بستنی پروتئینی کیوی|Kiwi protein ice cream|113|8|18|1|
بستنی پروتئینی آناناس|Pineapple protein ice cream|117|8|19|1|
بستنی پروتئینی پرتقال|Orange protein ice cream|117|8|19|1|
بستنی پروتئینی خرما|Date protein ice cream|151|9|22|3|
بستنی پروتئینی کره بادام‌زمینی|Peanut butter protein ice cream|179|11|18|7|
بستنی پروتئینی تیرامیسو|Tiramisu protein ice cream|157|9|19|5|
بستنی پروتئینی رد ولوت|Red velvet protein ice cream|159|8.5|20|5|
بستنی پروتئینی چیزکیک|Cheesecake protein ice cream|166|9|19|6|
بستنی پروتئینی مارشمالو|Marshmallow protein ice cream|147|8|22|3|
بستنی پروتئینی پاپ‌کورن کاراملی|Caramel popcorn protein ice cream|156|9|21|4|
بستنی پروتئینی شکلات سفید|White chocolate protein ice cream|159|8.5|20|5|
بستنی پروتئینی شکلات تلخ|Dark chocolate protein ice cream|145|9|16|5|
بستنی پروتئینی ماچا|Matcha protein ice cream|129|8.5|17|3|
بستنی پروتئینی آووکادو|Avocado protein ice cream|141|8|16|5|
بستنی پروتئینی گردو|Walnut protein ice cream|154|9|16|6|
بستنی پروتئینی انجیر|Fig protein ice cream|139|8|20|3|
بستنی پروتئینی هندوانه|Watermelon protein ice cream|113|8|18|1|
بستنی پروتئینی طالبی|Cantaloupe protein ice cream|113|8|18|1|
بستنی پروتئینی سیب|Apple protein ice cream|117|8|19|1|
بستنی پروتئینی انار|Pomegranate protein ice cream|117|8|19|1|
بستنی پروتئینی زردآلو|Apricot protein ice cream|122|8|18|2|
بستنی پروتئینی شیر و عسل|Milk and honey protein ice cream|131|8|18|3|
بستنی پروتئینی چای|Tea protein ice cream|127|8|17|3|
بستنی پروتئینی بیسکویت|Biscuit protein ice cream|152|9|20|4|
بستنی گیاهی وانیلی|Vanilla vegan ice cream|183|1.5|24|9|
بستنی گیاهی شکلاتی|Chocolate vegan ice cream|206|2|27|10|
بستنی گیاهی توت‌فرنگی|Strawberry vegan ice cream|182|1.5|26|8|
بستنی گیاهی قهوه|Coffee vegan ice cream|187|1.5|25|9|
بستنی گیاهی پسته|Pistachio vegan ice cream|216|3|24|12|
بستنی گیاهی زعفرانی|Saffron vegan ice cream|183|1.5|24|9|
بستنی گیاهی کارامل|Caramel vegan ice cream|199|1.5|28|9|
بستنی گیاهی نارگیل|Coconut vegan ice cream|210|1.5|24|12|
بستنی گیاهی موز|Banana vegan ice cream|186|1.5|27|8|
بستنی گیاهی فندق|Hazelnut vegan ice cream|218|2.5|25|12|
بستنی گیاهی بادام|Almond vegan ice cream|214|2.5|24|12|
بستنی گیاهی آلبالو|Sour cherry vegan ice cream|186|1.5|27|8|
بستنی گیاهی انبه|Mango vegan ice cream|186|1.5|27|8|
بستنی گیاهی لیمو|Lemon vegan ice cream|177|1.5|27|7|
بستنی گیاهی هل|Cardamom vegan ice cream|183|1.5|24|9|
بستنی گیاهی گلاب|Rose vegan ice cream|183|1.5|24|9|
بستنی گیاهی عسل|Honey vegan ice cream|195|1.5|27|9|
بستنی گیاهی دارچین|Cinnamon vegan ice cream|187|1.5|25|9|
بستنی گیاهی نوتلا|Nutella vegan ice cream|234|2.5|29|12|
بستنی گیاهی کوکی و کرم|Cookies and cream vegan ice cream|212|2.5|28|10|
بستنی گیاهی نعناع شکلاتی|Mint chocolate vegan ice cream|206|2|27|10|
بستنی گیاهی لوتوس|Lotus biscuit vegan ice cream|214|2|29|10|
بستنی گیاهی بلوبری|Blueberry vegan ice cream|182|1.5|26|8|
بستنی گیاهی هلو|Peach vegan ice cream|182|1.5|26|8|
بستنی گیاهی تمشک|Raspberry vegan ice cream|182|1.5|26|8|
بستنی گیاهی گیلاس|Cherry vegan ice cream|182|1.5|26|8|
بستنی گیاهی کیوی|Kiwi vegan ice cream|173|1.5|26|7|
بستنی گیاهی آناناس|Pineapple vegan ice cream|177|1.5|27|7|
بستنی گیاهی پرتقال|Orange vegan ice cream|177|1.5|27|7|
بستنی گیاهی خرما|Date vegan ice cream|211|2.5|30|9|
بستنی گیاهی کره بادام‌زمینی|Peanut butter vegan ice cream|239|4.5|26|13|
بستنی گیاهی تیرامیسو|Tiramisu vegan ice cream|217|2.5|27|11|
بستنی گیاهی رد ولوت|Red velvet vegan ice cream|219|2|28|11|
بستنی گیاهی چیزکیک|Cheesecake vegan ice cream|226|2.5|27|12|
بستنی گیاهی مارشمالو|Marshmallow vegan ice cream|207|1.5|30|9|
بستنی گیاهی پاپ‌کورن کاراملی|Caramel popcorn vegan ice cream|216|2.5|29|10|
بستنی گیاهی شکلات سفید|White chocolate vegan ice cream|219|2|28|11|
بستنی گیاهی شکلات تلخ|Dark chocolate vegan ice cream|205|2.5|24|11|
بستنی گیاهی ماچا|Matcha vegan ice cream|189|2|25|9|
بستنی گیاهی آووکادو|Avocado vegan ice cream|201|1.5|24|11|
بستنی گیاهی گردو|Walnut vegan ice cream|214|2.5|24|12|
بستنی گیاهی انجیر|Fig vegan ice cream|199|1.5|28|9|
بستنی گیاهی هندوانه|Watermelon vegan ice cream|173|1.5|26|7|
بستنی گیاهی طالبی|Cantaloupe vegan ice cream|173|1.5|26|7|
بستنی گیاهی سیب|Apple vegan ice cream|177|1.5|27|7|
بستنی گیاهی انار|Pomegranate vegan ice cream|177|1.5|27|7|
بستنی گیاهی زردآلو|Apricot vegan ice cream|182|1.5|26|8|
بستنی گیاهی شیر و عسل|Milk and honey vegan ice cream|191|1.5|26|9|
بستنی گیاهی چای|Tea vegan ice cream|187|1.5|25|9|
بستنی گیاهی بیسکویت|Biscuit vegan ice cream|212|2.5|28|10|
بستنی قیفی وانیلی|Vanilla cone ice cream|199|3.5|26|9|
بستنی قیفی شکلاتی|Chocolate cone ice cream|222|4|29|10|
بستنی قیفی توت‌فرنگی|Strawberry cone ice cream|198|3.5|28|8|
بستنی قیفی قهوه|Coffee cone ice cream|203|3.5|27|9|
بستنی قیفی پسته|Pistachio cone ice cream|232|5|26|12|
بستنی قیفی زعفرانی|Saffron cone ice cream|199|3.5|26|9|
بستنی قیفی کارامل|Caramel cone ice cream|215|3.5|30|9|
بستنی قیفی نارگیل|Coconut cone ice cream|226|3.5|26|12|
بستنی قیفی موز|Banana cone ice cream|202|3.5|29|8|
بستنی قیفی فندق|Hazelnut cone ice cream|234|4.5|27|12|
بستنی قیفی بادام|Almond cone ice cream|230|4.5|26|12|
بستنی قیفی آلبالو|Sour cherry cone ice cream|202|3.5|29|8|
بستنی قیفی انبه|Mango cone ice cream|202|3.5|29|8|
بستنی قیفی لیمو|Lemon cone ice cream|193|3.5|29|7|
بستنی قیفی هل|Cardamom cone ice cream|199|3.5|26|9|
بستنی قیفی گلاب|Rose cone ice cream|199|3.5|26|9|
بستنی قیفی عسل|Honey cone ice cream|211|3.5|29|9|
بستنی قیفی دارچین|Cinnamon cone ice cream|203|3.5|27|9|
بستنی قیفی نوتلا|Nutella cone ice cream|250|4.5|31|12|
بستنی قیفی کوکی و کرم|Cookies and cream cone ice cream|228|4.5|30|10|
بستنی قیفی نعناع شکلاتی|Mint chocolate cone ice cream|222|4|29|10|
بستنی قیفی لوتوس|Lotus biscuit cone ice cream|230|4|31|10|
بستنی قیفی بلوبری|Blueberry cone ice cream|198|3.5|28|8|
بستنی قیفی هلو|Peach cone ice cream|198|3.5|28|8|
بستنی قیفی تمشک|Raspberry cone ice cream|198|3.5|28|8|
بستنی قیفی گیلاس|Cherry cone ice cream|198|3.5|28|8|
بستنی قیفی کیوی|Kiwi cone ice cream|189|3.5|28|7|
بستنی قیفی آناناس|Pineapple cone ice cream|193|3.5|29|7|
بستنی قیفی پرتقال|Orange cone ice cream|193|3.5|29|7|
بستنی قیفی خرما|Date cone ice cream|227|4.5|32|9|
بستنی قیفی کره بادام‌زمینی|Peanut butter cone ice cream|255|6.5|28|13|
بستنی قیفی تیرامیسو|Tiramisu cone ice cream|233|4.5|29|11|
بستنی قیفی رد ولوت|Red velvet cone ice cream|235|4|30|11|
بستنی قیفی چیزکیک|Cheesecake cone ice cream|242|4.5|29|12|
بستنی قیفی مارشمالو|Marshmallow cone ice cream|223|3.5|32|9|
بستنی قیفی پاپ‌کورن کاراملی|Caramel popcorn cone ice cream|232|4.5|31|10|
بستنی قیفی شکلات سفید|White chocolate cone ice cream|235|4|30|11|
بستنی قیفی شکلات تلخ|Dark chocolate cone ice cream|221|4.5|26|11|
بستنی قیفی ماچا|Matcha cone ice cream|205|4|27|9|
بستنی قیفی آووکادو|Avocado cone ice cream|217|3.5|26|11|
بستنی قیفی گردو|Walnut cone ice cream|230|4.5|26|12|
بستنی قیفی انجیر|Fig cone ice cream|215|3.5|30|9|
بستنی قیفی هندوانه|Watermelon cone ice cream|189|3.5|28|7|
بستنی قیفی طالبی|Cantaloupe cone ice cream|189|3.5|28|7|
بستنی قیفی سیب|Apple cone ice cream|193|3.5|29|7|
بستنی قیفی انار|Pomegranate cone ice cream|193|3.5|29|7|
بستنی قیفی زردآلو|Apricot cone ice cream|198|3.5|28|8|
بستنی قیفی شیر و عسل|Milk and honey cone ice cream|207|3.5|28|9|
بستنی قیفی چای|Tea cone ice cream|203|3.5|27|9|
بستنی قیفی بیسکویت|Biscuit cone ice cream|228|4.5|30|10|
بستنی کاسه‌ای وانیلی|Vanilla ice cream bowl|205|3.5|23|11|
بستنی کاسه‌ای شکلاتی|Chocolate ice cream bowl|228|4|26|12|
بستنی کاسه‌ای توت‌فرنگی|Strawberry ice cream bowl|204|3.5|25|10|
بستنی کاسه‌ای قهوه|Coffee ice cream bowl|209|3.5|24|11|
بستنی کاسه‌ای پسته|Pistachio ice cream bowl|238|5|23|14|
بستنی کاسه‌ای زعفرانی|Saffron ice cream bowl|205|3.5|23|11|
بستنی کاسه‌ای کارامل|Caramel ice cream bowl|221|3.5|27|11|
بستنی کاسه‌ای نارگیل|Coconut ice cream bowl|232|3.5|23|14|
بستنی کاسه‌ای موز|Banana ice cream bowl|208|3.5|26|10|
بستنی کاسه‌ای فندق|Hazelnut ice cream bowl|240|4.5|24|14|
بستنی کاسه‌ای بادام|Almond ice cream bowl|236|4.5|23|14|
بستنی کاسه‌ای آلبالو|Sour cherry ice cream bowl|208|3.5|26|10|
بستنی کاسه‌ای انبه|Mango ice cream bowl|208|3.5|26|10|
بستنی کاسه‌ای لیمو|Lemon ice cream bowl|199|3.5|26|9|
بستنی کاسه‌ای هل|Cardamom ice cream bowl|205|3.5|23|11|
بستنی کاسه‌ای گلاب|Rose ice cream bowl|205|3.5|23|11|
بستنی کاسه‌ای عسل|Honey ice cream bowl|217|3.5|26|11|
بستنی کاسه‌ای دارچین|Cinnamon ice cream bowl|209|3.5|24|11|
بستنی کاسه‌ای نوتلا|Nutella ice cream bowl|256|4.5|28|14|
بستنی کاسه‌ای کوکی و کرم|Cookies and cream ice cream bowl|234|4.5|27|12|
بستنی کاسه‌ای نعناع شکلاتی|Mint chocolate ice cream bowl|228|4|26|12|
بستنی کاسه‌ای لوتوس|Lotus biscuit ice cream bowl|236|4|28|12|
بستنی کاسه‌ای بلوبری|Blueberry ice cream bowl|204|3.5|25|10|
بستنی کاسه‌ای هلو|Peach ice cream bowl|204|3.5|25|10|
بستنی کاسه‌ای تمشک|Raspberry ice cream bowl|204|3.5|25|10|
بستنی کاسه‌ای گیلاس|Cherry ice cream bowl|204|3.5|25|10|
بستنی کاسه‌ای کیوی|Kiwi ice cream bowl|195|3.5|25|9|
بستنی کاسه‌ای آناناس|Pineapple ice cream bowl|199|3.5|26|9|
بستنی کاسه‌ای پرتقال|Orange ice cream bowl|199|3.5|26|9|
بستنی کاسه‌ای خرما|Date ice cream bowl|233|4.5|29|11|
بستنی کاسه‌ای کره بادام‌زمینی|Peanut butter ice cream bowl|261|6.5|25|15|
بستنی کاسه‌ای تیرامیسو|Tiramisu ice cream bowl|239|4.5|26|13|
بستنی کاسه‌ای رد ولوت|Red velvet ice cream bowl|241|4|27|13|
بستنی کاسه‌ای چیزکیک|Cheesecake ice cream bowl|248|4.5|26|14|
بستنی کاسه‌ای مارشمالو|Marshmallow ice cream bowl|229|3.5|29|11|
بستنی کاسه‌ای پاپ‌کورن کاراملی|Caramel popcorn ice cream bowl|238|4.5|28|12|
بستنی کاسه‌ای شکلات سفید|White chocolate ice cream bowl|241|4|27|13|
بستنی کاسه‌ای شکلات تلخ|Dark chocolate ice cream bowl|227|4.5|23|13|
بستنی کاسه‌ای ماچا|Matcha ice cream bowl|211|4|24|11|
بستنی کاسه‌ای آووکادو|Avocado ice cream bowl|223|3.5|23|13|
بستنی کاسه‌ای گردو|Walnut ice cream bowl|236|4.5|23|14|
بستنی کاسه‌ای انجیر|Fig ice cream bowl|221|3.5|27|11|
بستنی کاسه‌ای هندوانه|Watermelon ice cream bowl|195|3.5|25|9|
بستنی کاسه‌ای طالبی|Cantaloupe ice cream bowl|195|3.5|25|9|
بستنی کاسه‌ای سیب|Apple ice cream bowl|199|3.5|26|9|
بستنی کاسه‌ای انار|Pomegranate ice cream bowl|199|3.5|26|9|
بستنی کاسه‌ای زردآلو|Apricot ice cream bowl|204|3.5|25|10|
بستنی کاسه‌ای شیر و عسل|Milk and honey ice cream bowl|213|3.5|25|11|
بستنی کاسه‌ای چای|Tea ice cream bowl|209|3.5|24|11|
بستنی کاسه‌ای بیسکویت|Biscuit ice cream bowl|234|4.5|27|12|
بستنی اکبر مشتی سنتی|Akbar Mashti saffron ice cream|208|3.5|26|10|
بستنی اکبر مشتی زعفرانی|Akbar Mashti saffron pistachio ice cream|219|4|26|11|
بستنی اکبر مشتی با خامه|Akbar Mashti ice cream with cream|244|3.5|26|14|
بستنی اکبر مشتی با پسته|Akbar Mashti pistachio ice cream|226|4.5|25|12|
بستنی اکبر مشتی با گلاب|Akbar Mashti rosewater ice cream|208|3.5|26|10|
بستنی سنتی خامه‌ای|Traditional cream ice cream|234|3|24|14|
بستنی سنتی صبحانه|Breakfast ice cream|201|3.5|22|11|
بستنی شیری ایرانی|Iranian milk ice cream|182|3.5|24|8|
بستنی چوبی شکلاتی|Chocolate ice cream bar|250|3|28|14|
بستنی چوبی وانیلی|Vanilla ice cream bar|224|3|26|12|
بستنی چوبی میوه‌ای|Fruit ice pop|81|0.3|20|0|
بستنی یخی لیمویی|Lemon ice pop|80|0|20|0|
بستنی یخی پرتقالی|Orange ice pop|80|0|20|0|
بستنی یخی آلبالو|Cherry ice pop|80|0|20|0|
بستنی یخی کولا|Cola ice pop|80|0|20|0|
بستنی یخی هندوانه|Watermelon ice pop|80|0|20|0|
بستنی یخی انبه|Mango ice pop|84|0|21|0|
بستنی یخی تمشک|Raspberry ice pop|80|0|20|0|
بستنی یخی توت‌فرنگی|Strawberry ice pop|80|0|20|0|
بستنی یخی آناناس|Pineapple ice pop|84|0|21|0|
سوربه لیمو|Lemon sorbet|121|0.3|30|0|
سوربه توت‌فرنگی|Strawberry sorbet|114|0.5|28|0|
سوربه انبه|Mango sorbet|114|0.5|28|0|
سوربه تمشک|Raspberry sorbet|114|0.5|28|0|
سوربه هندوانه|Watermelon sorbet|89|0.3|22|0|
سوربه پرتقال|Orange sorbet|114|0.4|28|0|
سوربه آلبالو|Sour cherry sorbet|114|0.4|28|0|
سوربه هلو|Peach sorbet|110|0.5|27|0|
سوربه آناناس|Pineapple sorbet|114|0.4|28|0|
سوربه نارگیل|Coconut sorbet|154|1|24|6|
گرانیتا لیمو|Lemon granita|96|0|24|0|
گرانیتا قهوه|Coffee granita|89|0.3|22|0|
گرانیتا توت‌فرنگی|Strawberry granita|97|0.3|24|0|
گرانیتا هندوانه|Watermelon granita|81|0.3|20|0|
گرانیتا پرتقال|Orange granita|97|0.3|24|0|
یخ در بهشت|Yakh dar behesht|188|3|26|8|
یخ در بهشت با شربت|Yakh dar behesht with syrup|201|2.5|32|7|
یخ در بهشت شکلاتی|Chocolate yakh dar behesht|213|3|30|9|
اسنوبال|Snowball dessert|214|3|28|10|
اسکیمو شکلاتی|Chocolate eskimo ice cream|260|3|26|16|
اسکیمو وانیلی|Vanilla eskimo ice cream|238|3|25|14|
بستنی ساندویچی شکلاتی|Chocolate ice cream sandwich|241|4|36|9|
بستنی ساندویچی بیسکویتی|Biscuit ice cream sandwich|240|4|38|8|
بستنی کیکی|Ice cream cake|260|4|34|12|
کیک بستنی شکلاتی|Chocolate ice cream cake|269|4|34|13|
کیک بستنی وانیلی|Vanilla ice cream cake|256|4|33|12|
بستنی رولتی|Ice cream roll|204|3|30|8|
بستنی رول تایلندی|Thai rolled ice cream|188|3|26|8|
بستنی ترکی|Turkish dondurma|179|3.5|30|5|
بستنی ترکی پسته‌ای|Turkish pistachio dondurma|199|4|30|7|
بستنی ترکی شکلاتی|Turkish chocolate dondurma|196|3.5|32|6|
موچی بستنی|Mochi ice cream|209|3|38|5|
موچی بستنی توت‌فرنگی|Strawberry mochi ice cream|209|3|38|5|
موچی بستنی ماچا|Matcha mochi ice cream|209|3|38|5|
موچی بستنی شکلاتی|Chocolate mochi ice cream|218|3|38|6|
موچی بستنی انبه|Mango mochi ice cream|209|3|38|5|
بستنی قیفی دو رنگ|Two-flavor cone ice cream|199|3.5|26|9|
بستنی لیوانی خامه‌ای|Cream cup ice cream|210|3.5|22|12|
بستنی لیوانی میوه‌ای|Fruit cup ice cream|180|3|24|8|
بستنی لیوانی دوقلو|Twin cup ice cream|200|3.5|24|10|
بستنی ظرف خانواده وانیلی|Family tub vanilla ice cream|205|3.5|23|11|
بستنی ظرف خانواده شکلاتی|Family tub chocolate ice cream|213|3.5|25|11|
بستنی ظرف خانواده سه‌رنگ|Family tub neapolitan ice cream|200|3.5|24|10|
بستنی میوه‌ای هلو|Peach fruit ice cream|164|2.5|25|6|
بستنی میوه‌ای تمشک|Raspberry fruit ice cream|164|2.5|25|6|
بستنی فالوده‌ای نارنجی|Orange faloodeh ice cream|179|3|26|7|
شکلات شیری قالبی|Milk chocolate bar|535|7|57|31|
شکلات شیری لقمه‌ای|Bite-size milk chocolate|535|7|57|31|
شکلات شیری روکش‌دار|Coated milk chocolate candy|519|6|63|27|
تابلت شکلات شیری|Milk chocolate tablet|535|7|57|31|
شکلات تلخ قالبی|Dark chocolate bar|594|8|46|42|
شکلات تلخ لقمه‌ای|Bite-size dark chocolate|594|8|46|42|
شکلات تلخ روکش‌دار|Coated dark chocolate candy|578|7|52|38|
تابلت شکلات تلخ|Dark chocolate tablet|594|8|46|42|
شکلات سفید قالبی|White chocolate bar|548|6|59|32|
شکلات سفید لقمه‌ای|Bite-size white chocolate|548|6|59|32|
شکلات سفید روکش‌دار|Coated white chocolate candy|532|5|65|28|
تابلت شکلات سفید|White chocolate tablet|548|6|59|32|
شکلات فندقی|Hazelnut chocolate|564|8|52|36|
شکلات فندقی قالبی|Hazelnut chocolate bar|564|8|52|36|
شکلات فندقی لقمه‌ای|Bite-size hazelnut chocolate|564|8|52|36|
شکلات فندقی روکش‌دار|Coated hazelnut chocolate candy|548|7|58|32|
تابلت شکلات فندقی|Hazelnut chocolate tablet|564|8|52|36|
شکلات بادامی|Almond chocolate|552|9|48|36|
شکلات بادامی قالبی|Almond chocolate bar|552|9|48|36|
شکلات بادامی لقمه‌ای|Bite-size almond chocolate|552|9|48|36|
شکلات بادامی روکش‌دار|Coated almond chocolate candy|536|8|54|32|
تابلت شکلات بادامی|Almond chocolate tablet|552|9|48|36|
شکلات پسته‌ای قالبی|Pistachio chocolate bar|552|9|48|36|
شکلات پسته‌ای لقمه‌ای|Bite-size pistachio chocolate|552|9|48|36|
شکلات پسته‌ای روکش‌دار|Coated pistachio chocolate candy|536|8|54|32|
تابلت شکلات پسته‌ای|Pistachio chocolate tablet|552|9|48|36|
شکلات کشمشی|Raisin chocolate|506|6|62|26|
شکلات کشمشی قالبی|Raisin chocolate bar|506|6|62|26|
شکلات کشمشی لقمه‌ای|Bite-size raisin chocolate|506|6|62|26|
شکلات کشمشی روکش‌دار|Coated raisin chocolate candy|490|5|68|22|
تابلت شکلات کشمشی|Raisin chocolate tablet|506|6|62|26|
شکلات نارگیلی|Coconut chocolate|532|6|55|32|
شکلات نارگیلی قالبی|Coconut chocolate bar|532|6|55|32|
شکلات نارگیلی لقمه‌ای|Bite-size coconut chocolate|532|6|55|32|
شکلات نارگیلی روکش‌دار|Coated coconut chocolate candy|516|5|61|28|
تابلت شکلات نارگیلی|Coconut chocolate tablet|532|6|55|32|
شکلات کارامل قالبی|Caramel chocolate bar|516|6|60|28|
شکلات کارامل لقمه‌ای|Bite-size caramel chocolate|516|6|60|28|
شکلات کارامل روکش‌دار|Coated caramel chocolate candy|500|5|66|24|
تابلت شکلات کارامل|Caramel chocolate tablet|516|6|60|28|
شکلات نعنایی|Mint chocolate|520|5|62|28|
شکلات نعنایی قالبی|Mint chocolate bar|520|5|62|28|
شکلات نعنایی لقمه‌ای|Bite-size mint chocolate|520|5|62|28|
شکلات نعنایی روکش‌دار|Coated mint chocolate candy|504|4|68|24|
تابلت شکلات نعنایی|Mint chocolate tablet|520|5|62|28|
شکلات پرتقالی|Orange chocolate|530|5|60|30|
شکلات پرتقالی قالبی|Orange chocolate bar|530|5|60|30|
شکلات پرتقالی لقمه‌ای|Bite-size orange chocolate|530|5|60|30|
شکلات پرتقالی روکش‌دار|Coated orange chocolate candy|514|4|66|26|
تابلت شکلات پرتقالی|Orange chocolate tablet|530|5|60|30|
شکلات قهوه|Coffee chocolate|526|6|58|30|
شکلات قهوه قالبی|Coffee chocolate bar|526|6|58|30|
شکلات قهوه لقمه‌ای|Bite-size coffee chocolate|526|6|58|30|
شکلات قهوه روکش‌دار|Coated coffee chocolate candy|510|5|64|26|
تابلت شکلات قهوه|Coffee chocolate tablet|526|6|58|30|
شکلات گردویی|Walnut chocolate|566|8|48|38|
شکلات گردویی قالبی|Walnut chocolate bar|566|8|48|38|
شکلات گردویی لقمه‌ای|Bite-size walnut chocolate|566|8|48|38|
شکلات گردویی روکش‌دار|Coated walnut chocolate candy|550|7|54|34|
تابلت شکلات گردویی|Walnut chocolate tablet|566|8|48|38|
شکلات با غلات|Cereal chocolate|510|7|62|26|
شکلات با غلات قالبی|Cereal chocolate bar|510|7|62|26|
شکلات با غلات لقمه‌ای|Bite-size cereal chocolate|510|7|62|26|
شکلات با غلات روکش‌دار|Coated cereal chocolate candy|494|6|68|22|
تابلت شکلات با غلات|Cereal chocolate tablet|510|7|62|26|
شکلات با برنج پفی|Crispy rice chocolate|510|7|62|26|
شکلات با برنج پفی قالبی|Crispy rice chocolate bar|510|7|62|26|
شکلات با برنج پفی لقمه‌ای|Bite-size crispy rice chocolate|510|7|62|26|
شکلات با برنج پفی روکش‌دار|Coated crispy rice chocolate candy|494|6|68|22|
تابلت شکلات با برنج پفی|Crispy rice chocolate tablet|510|7|62|26|
شکلات با بیسکویت|Biscuit chocolate|524|6|62|28|
شکلات با بیسکویت قالبی|Biscuit chocolate bar|524|6|62|28|
شکلات با بیسکویت لقمه‌ای|Bite-size biscuit chocolate|524|6|62|28|
شکلات با بیسکویت روکش‌دار|Coated biscuit chocolate candy|508|5|68|24|
تابلت شکلات با بیسکویت|Biscuit chocolate tablet|524|6|62|28|
شکلات با ویفر|Wafer chocolate|520|7|60|28|
شکلات با ویفر قالبی|Wafer chocolate bar|520|7|60|28|
شکلات با ویفر لقمه‌ای|Bite-size wafer chocolate|520|7|60|28|
شکلات با ویفر روکش‌دار|Coated wafer chocolate candy|504|6|66|24|
تابلت شکلات با ویفر|Wafer chocolate tablet|520|7|60|28|
شکلات با زعفران|Saffron chocolate|535|7|57|31|
شکلات با زعفران قالبی|Saffron chocolate bar|535|7|57|31|
شکلات با زعفران لقمه‌ای|Bite-size saffron chocolate|535|7|57|31|
شکلات با زعفران روکش‌دار|Coated saffron chocolate candy|519|6|63|27|
تابلت شکلات با زعفران|Saffron chocolate tablet|535|7|57|31|
شکلات با زنجبیل|Ginger chocolate|500|6|56|28|
شکلات با زنجبیل قالبی|Ginger chocolate bar|500|6|56|28|
شکلات با زنجبیل لقمه‌ای|Bite-size ginger chocolate|500|6|56|28|
شکلات با زنجبیل روکش‌دار|Coated ginger chocolate candy|484|5|62|24|
تابلت شکلات با زنجبیل|Ginger chocolate tablet|500|6|56|28|
شکلات با توت‌فرنگی|Strawberry chocolate|526|6|58|30|
شکلات با توت‌فرنگی قالبی|Strawberry chocolate bar|526|6|58|30|
شکلات با توت‌فرنگی لقمه‌ای|Bite-size strawberry chocolate|526|6|58|30|
شکلات با توت‌فرنگی روکش‌دار|Coated strawberry chocolate candy|510|5|64|26|
تابلت شکلات با توت‌فرنگی|Strawberry chocolate tablet|526|6|58|30|
شکلات با آلبالو|Cherry chocolate|508|6|58|28|
شکلات با آلبالو قالبی|Cherry chocolate bar|508|6|58|28|
شکلات با آلبالو لقمه‌ای|Bite-size cherry chocolate|508|6|58|28|
شکلات با آلبالو روکش‌دار|Coated cherry chocolate candy|492|5|64|24|
تابلت شکلات با آلبالو|Cherry chocolate tablet|508|6|58|28|
شکلات با فلفل|Chili chocolate|594|8|46|42|
شکلات با فلفل قالبی|Chili chocolate bar|594|8|46|42|
شکلات با فلفل لقمه‌ای|Bite-size chili chocolate|594|8|46|42|
شکلات با فلفل روکش‌دار|Coated chili chocolate candy|578|7|52|38|
تابلت شکلات با فلفل|Chili chocolate tablet|594|8|46|42|
شکلات با نمک|Salted chocolate|531|7|56|31|
شکلات با نمک قالبی|Salted chocolate bar|531|7|56|31|
شکلات با نمک لقمه‌ای|Bite-size salted chocolate|531|7|56|31|
شکلات با نمک روکش‌دار|Coated salted chocolate candy|515|6|62|27|
تابلت شکلات با نمک|Salted chocolate tablet|531|7|56|31|
شکلات با کاکائو نیبز|Cocoa nibs chocolate|576|8|46|40|
شکلات با کاکائو نیبز قالبی|Cocoa nibs chocolate bar|576|8|46|40|
شکلات با کاکائو نیبز لقمه‌ای|Bite-size cocoa nibs chocolate|576|8|46|40|
شکلات با کاکائو نیبز روکش‌دار|Coated cocoa nibs chocolate candy|560|7|52|36|
تابلت شکلات با کاکائو نیبز|Cocoa nibs chocolate tablet|576|8|46|40|
شکلات بدون شکر|Sugar-free chocolate|516|8|40|36|
شکلات بدون شکر قالبی|Sugar-free chocolate bar|516|8|40|36|
شکلات بدون شکر لقمه‌ای|Bite-size sugar-free chocolate|516|8|40|36|
شکلات بدون شکر روکش‌دار|Coated sugar-free chocolate candy|500|7|46|32|
تابلت شکلات بدون شکر|Sugar-free chocolate tablet|516|8|40|36|
شکلات کتو|Keto chocolate|534|9|12|50|
شکلات کتو قالبی|Keto chocolate bar|534|9|12|50|
شکلات کتو لقمه‌ای|Bite-size keto chocolate|534|9|12|50|
شکلات کتو روکش‌دار|Coated keto chocolate candy|518|8|18|46|
تابلت شکلات کتو|Keto chocolate tablet|534|9|12|50|
شکلات پروتئینی قالبی|Protein chocolate bar|424|20|32|24|
شکلات پروتئینی لقمه‌ای|Bite-size protein chocolate|424|20|32|24|
شکلات پروتئینی روکش‌دار|Coated protein chocolate candy|408|19|38|20|
تابلت شکلات پروتئینی|Protein chocolate tablet|424|20|32|24|
شکلات ورزشی|Sports chocolate|474|12|48|26|
شکلات ورزشی قالبی|Sports chocolate bar|474|12|48|26|
شکلات ورزشی لقمه‌ای|Bite-size sports chocolate|474|12|48|26|
شکلات ورزشی روکش‌دار|Coated sports chocolate candy|458|11|54|22|
تابلت شکلات ورزشی|Sports chocolate tablet|474|12|48|26|
شکلات خانگی|Homemade chocolate|522|7|56|30|
شکلات خانگی قالبی|Homemade chocolate bar|522|7|56|30|
شکلات خانگی لقمه‌ای|Bite-size homemade chocolate|522|7|56|30|
شکلات خانگی روکش‌دار|Coated homemade chocolate candy|506|6|62|26|
تابلت شکلات خانگی|Homemade chocolate tablet|522|7|56|30|
شکلات صبحانه قالبی|Breakfast chocolate bar|526|6|58|30|
شکلات صبحانه لقمه‌ای|Bite-size breakfast chocolate|526|6|58|30|
شکلات صبحانه روکش‌دار|Coated breakfast chocolate candy|510|5|64|26|
تابلت شکلات صبحانه|Breakfast chocolate tablet|526|6|58|30|
شکلات کودک|Kids chocolate|526|8|56|30|
شکلات کودک قالبی|Kids chocolate bar|526|8|56|30|
شکلات کودک لقمه‌ای|Bite-size kids chocolate|526|8|56|30|
شکلات کودک روکش‌دار|Coated kids chocolate candy|510|7|62|26|
تابلت شکلات کودک|Kids chocolate tablet|526|8|56|30|
شکلات مغزدار قالبی|Filled chocolate bar|536|6|56|32|
شکلات مغزدار لقمه‌ای|Bite-size filled chocolate|536|6|56|32|
شکلات مغزدار روکش‌دار|Coated filled chocolate candy|520|5|62|28|
تابلت شکلات مغزدار|Filled chocolate tablet|536|6|56|32|
شکلات ترافل|Truffle chocolate|544|5|50|36|
شکلات ترافل قالبی|Truffle chocolate bar|544|5|50|36|
شکلات ترافل لقمه‌ای|Bite-size truffle chocolate|544|5|50|36|
شکلات ترافل روکش‌دار|Coated truffle chocolate candy|528|4|56|32|
تابلت شکلات ترافل|Truffle chocolate tablet|544|5|50|36|
شکلات فرانسوی|French chocolate|538|6|52|34|
شکلات فرانسوی قالبی|French chocolate bar|538|6|52|34|
شکلات فرانسوی لقمه‌ای|Bite-size French chocolate|538|6|52|34|
شکلات فرانسوی روکش‌دار|Coated French chocolate candy|522|5|58|30|
تابلت شکلات فرانسوی|French chocolate tablet|538|6|52|34|
شکلات بلژیکی|Belgian chocolate|542|7|52|34|
شکلات بلژیکی قالبی|Belgian chocolate bar|542|7|52|34|
شکلات بلژیکی لقمه‌ای|Bite-size Belgian chocolate|542|7|52|34|
شکلات بلژیکی روکش‌دار|Coated Belgian chocolate candy|526|6|58|30|
تابلت شکلات بلژیکی|Belgian chocolate tablet|542|7|52|34|
شکلات سوئیسی|Swiss chocolate|540|7|56|32|
شکلات سوئیسی قالبی|Swiss chocolate bar|540|7|56|32|
شکلات سوئیسی لقمه‌ای|Bite-size Swiss chocolate|540|7|56|32|
شکلات سوئیسی روکش‌دار|Coated Swiss chocolate candy|524|6|62|28|
تابلت شکلات سوئیسی|Swiss chocolate tablet|540|7|56|32|
شکلات ایرانی|Iranian chocolate|526|6|58|30|
شکلات ایرانی قالبی|Iranian chocolate bar|526|6|58|30|
شکلات ایرانی لقمه‌ای|Bite-size Iranian chocolate|526|6|58|30|
شکلات ایرانی روکش‌دار|Coated Iranian chocolate candy|510|5|64|26|
تابلت شکلات ایرانی|Iranian chocolate tablet|526|6|58|30|
شکلات کاکائو 70 درصد|70% cocoa chocolate|584|9|38|44|
شکلات کاکائو 70 درصد قالبی|70% cocoa chocolate bar|584|9|38|44|
شکلات کاکائو 70 درصد لقمه‌ای|Bite-size 70% cocoa chocolate|584|9|38|44|
شکلات کاکائو 70 درصد روکش‌دار|Coated 70% cocoa chocolate candy|568|8|44|40|
تابلت شکلات کاکائو 70 درصد|70% cocoa chocolate tablet|584|9|38|44|
شکلات کاکائو 85 درصد|85% cocoa chocolate|606|11|28|50|
شکلات کاکائو 85 درصد قالبی|85% cocoa chocolate bar|606|11|28|50|
شکلات کاکائو 85 درصد لقمه‌ای|Bite-size 85% cocoa chocolate|606|11|28|50|
شکلات کاکائو 85 درصد روکش‌دار|Coated 85% cocoa chocolate candy|590|10|34|46|
تابلت شکلات کاکائو 85 درصد|85% cocoa chocolate tablet|606|11|28|50|
شکلات کاکائو 90 درصد|90% cocoa chocolate|622|12|22|54|
شکلات کاکائو 90 درصد قالبی|90% cocoa chocolate bar|622|12|22|54|
شکلات کاکائو 90 درصد لقمه‌ای|Bite-size 90% cocoa chocolate|622|12|22|54|
شکلات کاکائو 90 درصد روکش‌دار|Coated 90% cocoa chocolate candy|606|11|28|50|
تابلت شکلات کاکائو 90 درصد|90% cocoa chocolate tablet|622|12|22|54|
شکلات کاکائو 50 درصد|50% cocoa chocolate|570|7|50|38|
شکلات کاکائو 50 درصد قالبی|50% cocoa chocolate bar|570|7|50|38|
شکلات کاکائو 50 درصد لقمه‌ای|Bite-size 50% cocoa chocolate|570|7|50|38|
شکلات کاکائو 50 درصد روکش‌دار|Coated 50% cocoa chocolate candy|554|6|56|34|
تابلت شکلات کاکائو 50 درصد|50% cocoa chocolate tablet|570|7|50|38|
شکلات کاکائو 60 درصد|60% cocoa chocolate|580|7|48|40|
شکلات کاکائو 60 درصد قالبی|60% cocoa chocolate bar|580|7|48|40|
شکلات کاکائو 60 درصد لقمه‌ای|Bite-size 60% cocoa chocolate|580|7|48|40|
شکلات کاکائو 60 درصد روکش‌دار|Coated 60% cocoa chocolate candy|564|6|54|36|
تابلت شکلات کاکائو 60 درصد|60% cocoa chocolate tablet|580|7|48|40|
شکلات کاکائو 99 درصد|99% cocoa chocolate|564|14|10|52|
شکلات کاکائو 99 درصد قالبی|99% cocoa chocolate bar|564|14|10|52|
شکلات کاکائو 99 درصد لقمه‌ای|Bite-size 99% cocoa chocolate|564|14|10|52|
شکلات کاکائو 99 درصد روکش‌دار|Coated 99% cocoa chocolate candy|548|13|16|48|
تابلت شکلات کاکائو 99 درصد|99% cocoa chocolate tablet|564|14|10|52|
شکلات توت‌سیاه|Blackberry chocolate|532|7|54|32|
شکلات توت‌سیاه قالبی|Blackberry chocolate bar|532|7|54|32|
شکلات توت‌سیاه لقمه‌ای|Bite-size blackberry chocolate|532|7|54|32|
شکلات توت‌سیاه روکش‌دار|Coated blackberry chocolate candy|516|6|60|28|
تابلت شکلات توت‌سیاه|Blackberry chocolate tablet|532|7|54|32|
شکلات انجیر|Fig chocolate|490|6|58|26|
شکلات انجیر قالبی|Fig chocolate bar|490|6|58|26|
شکلات انجیر لقمه‌ای|Bite-size fig chocolate|490|6|58|26|
شکلات انجیر روکش‌دار|Coated fig chocolate candy|474|5|64|22|
تابلت شکلات انجیر|Fig chocolate tablet|490|6|58|26|
شکلات خرما|Date chocolate|500|6|56|28|
شکلات خرما قالبی|Date chocolate bar|500|6|56|28|
شکلات خرما لقمه‌ای|Bite-size date chocolate|500|6|56|28|
شکلات خرما روکش‌دار|Coated date chocolate candy|484|5|62|24|
تابلت شکلات خرما|Date chocolate tablet|500|6|56|28|
شکلات مارزیپان|Marzipan chocolate|498|7|50|30|
شکلات مارزیپان قالبی|Marzipan chocolate bar|498|7|50|30|
شکلات مارزیپان لقمه‌ای|Bite-size marzipan chocolate|498|7|50|30|
شکلات مارزیپان روکش‌دار|Coated marzipan chocolate candy|482|6|56|26|
تابلت شکلات مارزیپان|Marzipan chocolate tablet|498|7|50|30|
شکلات پرالین|Praline chocolate|542|7|52|34|
شکلات پرالین قالبی|Praline chocolate bar|542|7|52|34|
شکلات پرالین لقمه‌ای|Bite-size praline chocolate|542|7|52|34|
شکلات پرالین روکش‌دار|Coated praline chocolate candy|526|6|58|30|
تابلت شکلات پرالین|Praline chocolate tablet|542|7|52|34|
شکلات جیاندویا|Gianduja chocolate|560|7|52|36|
شکلات جیاندویا قالبی|Gianduja chocolate bar|560|7|52|36|
شکلات جیاندویا لقمه‌ای|Bite-size gianduja chocolate|560|7|52|36|
شکلات جیاندویا روکش‌دار|Coated gianduja chocolate candy|544|6|58|32|
تابلت شکلات جیاندویا|Gianduja chocolate tablet|560|7|52|36|
شکلات لیکوری|Liqueur chocolate|486|5|58|26|
شکلات لیکوری قالبی|Liqueur chocolate bar|486|5|58|26|
شکلات لیکوری لقمه‌ای|Bite-size liqueur chocolate|486|5|58|26|
شکلات لیکوری روکش‌دار|Coated liqueur chocolate candy|470|4|64|22|
تابلت شکلات لیکوری|Liqueur chocolate tablet|486|5|58|26|
توپک شکلاتی|Chocolate truffle ball|536|5|48|36|
ترافل شکلات تلخ|Dark chocolate truffle|548|5|42|40|
ترافل شکلات شیری|Milk chocolate truffle|526|5|50|34|
ترافل فندقی|Hazelnut truffle|550|6|46|38|
ترافل نارگیلی|Coconut truffle|536|5|48|36|
ترافل قهوه|Coffee truffle|528|5|46|36|
ترافل نارنجی|Orange truffle|536|5|48|36|
ترافل پسته|Pistachio truffle|550|6|46|38|
بنبن شکلاتی|Chocolate bonbon|514|5|56|30|
بنبن کارامل|Caramel bonbon|498|4|62|26|
بنبن مغزدار|Filled bonbon|514|5|56|30|
پرالین|Praline|538|6|52|34|
ماسپین|Marzipan|452|9|50|24|
ماسپین شکلاتی|Chocolate marzipan|474|8|52|26|
فاج|Fudge|422|2|72|14|
فاج شکلاتی|Chocolate fudge|436|3|70|16|
فاج گردویی|Walnut fudge|460|4|66|20|
فاج کره بادام‌زمینی|Peanut butter fudge|468|6|66|20|
نوقا بادامی|Almond nougat|490|9|64|22|
نوقا پسته‌ای|Pistachio nougat|490|9|64|22|
توفی|Toffee|464|1|70|20|
توفی کره‌ای|Butter toffee|454|1|72|18|
توفی بادامی|Almond toffee|510|5|64|26|
کارامل شکلاتی|Chocolate caramel|436|3|70|16|
آبنبات|Hard candy|392|0|98|0|آب نبات
`;
const S3 = `
آبنبات میوه‌ای|Fruit hard candy|392|0|98|0|
آبنبات نعنایی|Mint hard candy|392|0|98|0|
آبنبات لیمویی|Lemon hard candy|392|0|98|0|
آبنبات قهوه‌ای|Coffee hard candy|392|0|98|0|
آبنبات عسلی|Honey hard candy|392|0|98|0|
آبنبات بدون شکر|Sugar-free hard candy|368|0|92|0|
آبنبات چوبی|Lollipop|392|0|98|0|
آبنبات مکیدنی|Suckable candy|392|0|98|0|
آبنبات اکالیپتوس|Eucalyptus candy|388|0|97|0|
آبنبات زنجبیلی|Ginger candy|388|0|97|0|
آبنبات گلاب|Rose candy|392|0|98|0|
آبنبات زعفرانی|Saffron candy|392|0|98|0|
آبنبات ترش|Sour candy|368|0|92|0|
آبنبات پرتقالی|Orange hard candy|392|0|98|0|
آبنبات کولا|Cola candy|392|0|98|0|
آبنبات هل|Cardamom candy|392|0|98|0|
پاستیل خرسی|Gummy bears|332|6|77|0|
پاستیل ترش|Sour gummies|328|4|78|0|
پاستیل حلقه‌ای|Gummy rings|328|4|78|0|
پاستیل کولا|Cola gummies|328|4|78|0|
پاستیل هندوانه|Watermelon gummies|328|4|78|0|
پاستیل توت‌فرنگی|Strawberry gummies|328|4|78|0|
پاستیل کرم‌دار|Cream gummies|330|4|74|2|
پاستیل بدون شکر|Sugar-free gummies|240|5|55|0|
پاستیل ویتامینی|Vitamin gummies|248|2|60|0|
پاستیل میوه‌ای طبیعی|Natural fruit gummies|292|3|70|0|
پاستیل لوله‌ای|Gummy rope|312|3|74|0.5|
پاستیل کرمی|Gummy worms|328|4|78|0|
پاستیل شکری|Sugar coated gummies|336|4|80|0|
پاستیل مارمولکی|Gummy lizards|328|5|77|0|
ژل‌کندی|Jelly candy|338|0.5|84|0|
ژل‌کندی ترش|Sour jelly candy|338|0.5|84|0|
مارشمالو وانیلی|Vanilla marshmallow|332|2|81|0|
مارشمالو شکلاتی|Chocolate marshmallow|353|3|74|5|
مارشمالو توت‌فرنگی|Strawberry marshmallow|332|2|81|0|
مارشمالو نارگیلی|Coconut marshmallow|359|2|72|7|
آدامس بدون شکر|Sugar-free gum|256|0|64|0|
آدامس نعنایی|Mint gum|380|0|95|0|
آدامس میوه‌ای|Fruit gum|380|0|95|0|
آدامس بادکنکی|Bubble gum|376|0|94|0|
آدامس دارچینی|Cinnamon gum|380|0|95|0|
آدامس ترش|Sour gum|376|0|94|0|
آدامس قهوه|Coffee gum|380|0|95|0|
اسمارتیز|Smarties candy|436|3|70|16|
ام‌اندام|M and M style candies|480|5|70|20|
ام‌اندام بادام‌زمینی|Peanut M and M style candies|505|10|60|25|
دراژه شکلاتی|Chocolate dragee|496|6|64|24|
دراژه بادام|Almond dragee|516|10|56|28|
دراژه فندق|Hazelnut dragee|530|9|56|30|
دراژه پسته|Pistachio dragee|518|10|52|30|
دراژه نخودچی|Chickpea dragee|458|8|66|18|
دراژه کشمشی|Raisin dragee|482|5|66|22|
دراژه بادام‌زمینی|Peanut dragee|512|11|54|28|
دراژه رنگی|Colored dragee|408|1|92|4|
دراژه توت|Berry dragee|418|3|70|14|
شکلات کوچک مغزدار|Small filled chocolate|522|5|58|30|
شکلات بیسکویتی ویفری|Wafer chocolate bar|516|6|60|28|
شکلات کاراملی بار|Caramel chocolate bar|478|4|66|22|
شکلات نوقایی بار|Nougat chocolate bar|488|6|62|24|
شکلات بادام‌زمینی بار|Peanut chocolate bar|492|10|50|28|
شکلات نارگیلی بار|Coconut chocolate bar|482|4|58|26|
شکلات برنجی بار|Crispy rice chocolate bar|482|5|66|22|
شکلات فندقی بار|Hazelnut chocolate bar|522|7|56|30|
لوله شکلاتی|Chocolate tube|510|5|64|26|
اسکیتلز|Skittles style candy|396|0|90|4|
لیکوریس|Licorice|340|3|82|0|
لیکوریس سیاه|Black licorice|337|2|80|1|
لیکوریس قرمز|Red licorice|341|3|80|1|
پنبه‌ای|Cotton candy|392|0|98|0|
پنبه‌ای رنگی|Colored cotton candy|392|0|98|0|
آب‌نبات پرتقالی ترش|Sour orange candy|368|0|92|0|
قند شکلاتی|Chocolate sugar|400|1|90|4|
کاراملی پاپ‌کورن|Caramel popcorn|402|2|76|10|
چوب شکلات|Chocolate stick|516|6|60|28|
شکلات داغ پودری|Hot chocolate powder|400|6|76|8|
پودر کاکائو تلخ|Unsweetened cocoa powder|438|20|58|14|
پودر شکلات صبحانه|Breakfast chocolate powder|376|5|80|4|
کاکائو نیبز|Cocoa nibs|618|14|28|50|
مربای آلبالو کم‌شکر|Reduced sugar sour cherry preserve|163|0.5|40|0.1|
مربای آلبالو خانگی|Homemade sour cherry preserve|242|0.4|60|0.1|
ژله میوه آلبالو|Fruit jelly spread sour cherry|249|0.3|62|0|
مارمالاد آلبالو|Sour cherry marmalade|250|0.3|62|0.1|
شیره آلبالو|Sour cherry syrup|281|0.3|70|0|
ترشی تند آلبالو شیرین|Sweet sour cherry relish|140|0.5|34|0.2|
مربای توت‌فرنگی کم‌شکر|Reduced sugar strawberry preserve|163|0.5|40|0.1|
مربای توت‌فرنگی خانگی|Homemade strawberry preserve|242|0.4|60|0.1|
ژله میوه توت‌فرنگی|Fruit jelly spread strawberry|249|0.3|62|0|
مارمالاد توت‌فرنگی|Strawberry marmalade|250|0.3|62|0.1|
شیره توت‌فرنگی|Strawberry syrup|281|0.3|70|0|
ترشی تند توت‌فرنگی شیرین|Sweet strawberry relish|140|0.5|34|0.2|
مربای به کم‌شکر|Reduced sugar quince preserve|163|0.5|40|0.1|
مربای به خانگی|Homemade quince preserve|242|0.4|60|0.1|
ژله میوه به|Fruit jelly spread quince|249|0.3|62|0|
مارمالاد به|Quince marmalade|250|0.3|62|0.1|
شیره به|Quince syrup|281|0.3|70|0|
ترشی تند به شیرین|Sweet quince relish|140|0.5|34|0.2|
مربای هویج کم‌شکر|Reduced sugar carrot preserve|163|0.5|40|0.1|
مربای هویج خانگی|Homemade carrot preserve|242|0.4|60|0.1|
ژله میوه هویج|Fruit jelly spread carrot|249|0.3|62|0|
مارمالاد هویج|Carrot marmalade|250|0.3|62|0.1|
شیره هویج|Carrot syrup|281|0.3|70|0|
ترشی تند هویج شیرین|Sweet carrot relish|140|0.5|34|0.2|
مربای زردآلو کم‌شکر|Reduced sugar apricot preserve|163|0.5|40|0.1|
مربای زردآلو خانگی|Homemade apricot preserve|242|0.4|60|0.1|
ژله میوه زردآلو|Fruit jelly spread apricot|249|0.3|62|0|
مارمالاد زردآلو|Apricot marmalade|250|0.3|62|0.1|
شیره زردآلو|Apricot syrup|281|0.3|70|0|
ترشی تند زردآلو شیرین|Sweet apricot relish|140|0.5|34|0.2|
مربای انجیر کم‌شکر|Reduced sugar fig preserve|163|0.5|40|0.1|
مربای انجیر خانگی|Homemade fig preserve|242|0.4|60|0.1|
ژله میوه انجیر|Fruit jelly spread fig|249|0.3|62|0|
مارمالاد انجیر|Fig marmalade|250|0.3|62|0.1|
ترشی تند انجیر شیرین|Sweet fig relish|140|0.5|34|0.2|
مربای گیلاس کم‌شکر|Reduced sugar cherry preserve|163|0.5|40|0.1|
مربای گیلاس خانگی|Homemade cherry preserve|242|0.4|60|0.1|
ژله میوه گیلاس|Fruit jelly spread cherry|249|0.3|62|0|
مارمالاد گیلاس|Cherry marmalade|250|0.3|62|0.1|
شیره گیلاس|Cherry syrup|281|0.3|70|0|
ترشی تند گیلاس شیرین|Sweet cherry relish|140|0.5|34|0.2|
مربای آلوچه|Cherry plum preserve|258|0.4|64|0.1|
مربای آلوچه کم‌شکر|Reduced sugar cherry plum preserve|163|0.5|40|0.1|
مربای آلوچه خانگی|Homemade cherry plum preserve|242|0.4|60|0.1|
ژله میوه آلوچه|Fruit jelly spread cherry plum|249|0.3|62|0|
مارمالاد آلوچه|Cherry plum marmalade|250|0.3|62|0.1|
شیره آلوچه|Cherry plum syrup|281|0.3|70|0|
ترشی تند آلوچه شیرین|Sweet cherry plum relish|140|0.5|34|0.2|
مربای بالنگ کم‌شکر|Reduced sugar citron preserve|163|0.5|40|0.1|
مربای بالنگ خانگی|Homemade citron preserve|242|0.4|60|0.1|
ژله میوه بالنگ|Fruit jelly spread citron|249|0.3|62|0|
مارمالاد بالنگ|Citron marmalade|250|0.3|62|0.1|
شیره بالنگ|Citron syrup|281|0.3|70|0|
ترشی تند بالنگ شیرین|Sweet citron relish|140|0.5|34|0.2|
مربای پرتقال کم‌شکر|Reduced sugar orange preserve|163|0.5|40|0.1|
مربای پرتقال خانگی|Homemade orange preserve|242|0.4|60|0.1|
ژله میوه پرتقال|Fruit jelly spread orange|249|0.3|62|0|
مارمالاد پرتقال|Orange marmalade|250|0.3|62|0.1|
شیره پرتقال|Orange syrup|281|0.3|70|0|
ترشی تند پرتقال شیرین|Sweet orange relish|140|0.5|34|0.2|
مربای نارنج|Bitter orange preserve|258|0.4|64|0.1|
مربای نارنج کم‌شکر|Reduced sugar bitter orange preserve|163|0.5|40|0.1|
مربای نارنج خانگی|Homemade bitter orange preserve|242|0.4|60|0.1|
ژله میوه نارنج|Fruit jelly spread bitter orange|249|0.3|62|0|
مارمالاد نارنج|Bitter orange marmalade|250|0.3|62|0.1|
شیره نارنج|Bitter orange syrup|281|0.3|70|0|
ترشی تند نارنج شیرین|Sweet bitter orange relish|140|0.5|34|0.2|
مربای سیب کم‌شکر|Reduced sugar apple preserve|163|0.5|40|0.1|
مربای سیب خانگی|Homemade apple preserve|242|0.4|60|0.1|
ژله میوه سیب|Fruit jelly spread apple|249|0.3|62|0|
مارمالاد سیب|Apple marmalade|250|0.3|62|0.1|
شیره سیب|Apple syrup|281|0.3|70|0|
ترشی تند سیب شیرین|Sweet apple relish|140|0.5|34|0.2|
مربای گلابی|Pear preserve|258|0.4|64|0.1|
مربای گلابی کم‌شکر|Reduced sugar pear preserve|163|0.5|40|0.1|
مربای گلابی خانگی|Homemade pear preserve|242|0.4|60|0.1|
ژله میوه گلابی|Fruit jelly spread pear|249|0.3|62|0|
مارمالاد گلابی|Pear marmalade|250|0.3|62|0.1|
شیره گلابی|Pear syrup|281|0.3|70|0|
ترشی تند گلابی شیرین|Sweet pear relish|140|0.5|34|0.2|
مربای هلو کم‌شکر|Reduced sugar peach preserve|163|0.5|40|0.1|
مربای هلو خانگی|Homemade peach preserve|242|0.4|60|0.1|
ژله میوه هلو|Fruit jelly spread peach|249|0.3|62|0|
مارمالاد هلو|Peach marmalade|250|0.3|62|0.1|
شیره هلو|Peach syrup|281|0.3|70|0|
ترشی تند هلو شیرین|Sweet peach relish|140|0.5|34|0.2|
مربای انبه|Mango preserve|258|0.4|64|0.1|
مربای انبه کم‌شکر|Reduced sugar mango preserve|163|0.5|40|0.1|
مربای انبه خانگی|Homemade mango preserve|242|0.4|60|0.1|
ژله میوه انبه|Fruit jelly spread mango|249|0.3|62|0|
مارمالاد انبه|Mango marmalade|250|0.3|62|0.1|
شیره انبه|Mango syrup|281|0.3|70|0|
ترشی تند انبه شیرین|Sweet mango relish|140|0.5|34|0.2|
مربای آناناس|Pineapple preserve|258|0.4|64|0.1|
مربای آناناس کم‌شکر|Reduced sugar pineapple preserve|163|0.5|40|0.1|
مربای آناناس خانگی|Homemade pineapple preserve|242|0.4|60|0.1|
ژله میوه آناناس|Fruit jelly spread pineapple|249|0.3|62|0|
مارمالاد آناناس|Pineapple marmalade|250|0.3|62|0.1|
شیره آناناس|Pineapple syrup|281|0.3|70|0|
ترشی تند آناناس شیرین|Sweet pineapple relish|140|0.5|34|0.2|
مربای تمشک کم‌شکر|Reduced sugar raspberry preserve|163|0.5|40|0.1|
مربای تمشک خانگی|Homemade raspberry preserve|242|0.4|60|0.1|
ژله میوه تمشک|Fruit jelly spread raspberry|249|0.3|62|0|
مارمالاد تمشک|Raspberry marmalade|250|0.3|62|0.1|
شیره تمشک|Raspberry syrup|281|0.3|70|0|
ترشی تند تمشک شیرین|Sweet raspberry relish|140|0.5|34|0.2|
مربای بلوبری کم‌شکر|Reduced sugar blueberry preserve|163|0.5|40|0.1|
مربای بلوبری خانگی|Homemade blueberry preserve|242|0.4|60|0.1|
ژله میوه بلوبری|Fruit jelly spread blueberry|249|0.3|62|0|
مارمالاد بلوبری|Blueberry marmalade|250|0.3|62|0.1|
شیره بلوبری|Blueberry syrup|281|0.3|70|0|
ترشی تند بلوبری شیرین|Sweet blueberry relish|140|0.5|34|0.2|
مربای توت|Mulberry preserve|258|0.4|64|0.1|
مربای توت کم‌شکر|Reduced sugar mulberry preserve|163|0.5|40|0.1|
مربای توت خانگی|Homemade mulberry preserve|242|0.4|60|0.1|
ژله میوه توت|Fruit jelly spread mulberry|249|0.3|62|0|
مارمالاد توت|Mulberry marmalade|250|0.3|62|0.1|
ترشی تند توت شیرین|Sweet mulberry relish|140|0.5|34|0.2|
مربای شاه‌توت|White mulberry preserve|258|0.4|64|0.1|
مربای شاه‌توت کم‌شکر|Reduced sugar white mulberry preserve|163|0.5|40|0.1|
مربای شاه‌توت خانگی|Homemade white mulberry preserve|242|0.4|60|0.1|
ژله میوه شاه‌توت|Fruit jelly spread white mulberry|249|0.3|62|0|
مارمالاد شاه‌توت|White mulberry marmalade|250|0.3|62|0.1|
شیره شاه‌توت|White mulberry syrup|281|0.3|70|0|
ترشی تند شاه‌توت شیرین|Sweet white mulberry relish|140|0.5|34|0.2|
مربای زرشک|Barberry preserve|258|0.4|64|0.1|
مربای زرشک کم‌شکر|Reduced sugar barberry preserve|163|0.5|40|0.1|
مربای زرشک خانگی|Homemade barberry preserve|242|0.4|60|0.1|
ژله میوه زرشک|Fruit jelly spread barberry|249|0.3|62|0|
مارمالاد زرشک|Barberry marmalade|250|0.3|62|0.1|
شیره زرشک|Barberry syrup|281|0.3|70|0|
ترشی تند زرشک شیرین|Sweet barberry relish|140|0.5|34|0.2|
مربای انگور کم‌شکر|Reduced sugar grape preserve|163|0.5|40|0.1|
مربای انگور خانگی|Homemade grape preserve|242|0.4|60|0.1|
ژله میوه انگور|Fruit jelly spread grape|249|0.3|62|0|
مارمالاد انگور|Grape marmalade|250|0.3|62|0.1|
ترشی تند انگور شیرین|Sweet grape relish|140|0.5|34|0.2|
مربای کدو حلوایی|Pumpkin preserve|258|0.4|64|0.1|
مربای کدو حلوایی کم‌شکر|Reduced sugar pumpkin preserve|163|0.5|40|0.1|
مربای کدو حلوایی خانگی|Homemade pumpkin preserve|242|0.4|60|0.1|
ژله میوه کدو حلوایی|Fruit jelly spread pumpkin|249|0.3|62|0|
مارمالاد کدو حلوایی|Pumpkin marmalade|250|0.3|62|0.1|
شیره کدو حلوایی|Pumpkin syrup|281|0.3|70|0|
ترشی تند کدو حلوایی شیرین|Sweet pumpkin relish|140|0.5|34|0.2|
مربای لیمو|Lemon preserve|258|0.4|64|0.1|
مربای لیمو کم‌شکر|Reduced sugar lemon preserve|163|0.5|40|0.1|
مربای لیمو خانگی|Homemade lemon preserve|242|0.4|60|0.1|
ژله میوه لیمو|Fruit jelly spread lemon|249|0.3|62|0|
مارمالاد لیمو|Lemon marmalade|250|0.3|62|0.1|
شیره لیمو|Lemon syrup|281|0.3|70|0|
ترشی تند لیمو شیرین|Sweet lemon relish|140|0.5|34|0.2|
مربای بادمجان|Eggplant preserve|258|0.4|64|0.1|
مربای بادمجان کم‌شکر|Reduced sugar eggplant preserve|163|0.5|40|0.1|
مربای بادمجان خانگی|Homemade eggplant preserve|242|0.4|60|0.1|
ژله میوه بادمجان|Fruit jelly spread eggplant|249|0.3|62|0|
مارمالاد بادمجان|Eggplant marmalade|250|0.3|62|0.1|
شیره بادمجان|Eggplant syrup|281|0.3|70|0|
ترشی تند بادمجان شیرین|Sweet eggplant relish|140|0.5|34|0.2|
مربای گل سرخ کم‌شکر|Reduced sugar rose petal preserve|163|0.5|40|0.1|
مربای گل سرخ خانگی|Homemade rose petal preserve|242|0.4|60|0.1|
ژله میوه گل سرخ|Fruit jelly spread rose petal|249|0.3|62|0|
مارمالاد گل سرخ|Rose petal marmalade|250|0.3|62|0.1|
شیره گل سرخ|Rose petal syrup|281|0.3|70|0|
ترشی تند گل سرخ شیرین|Sweet rose petal relish|140|0.5|34|0.2|
مربای پوست پرتقال|Orange peel preserve|258|0.4|64|0.1|
مربای پوست پرتقال کم‌شکر|Reduced sugar orange peel preserve|163|0.5|40|0.1|
مربای پوست پرتقال خانگی|Homemade orange peel preserve|242|0.4|60|0.1|
ژله میوه پوست پرتقال|Fruit jelly spread orange peel|249|0.3|62|0|
مارمالاد پوست پرتقال|Orange peel marmalade|250|0.3|62|0.1|
شیره پوست پرتقال|Orange peel syrup|281|0.3|70|0|
ترشی تند پوست پرتقال شیرین|Sweet orange peel relish|140|0.5|34|0.2|
مربای پوست نارنج|Bitter orange peel preserve|258|0.4|64|0.1|
مربای پوست نارنج کم‌شکر|Reduced sugar bitter orange peel preserve|163|0.5|40|0.1|
مربای پوست نارنج خانگی|Homemade bitter orange peel preserve|242|0.4|60|0.1|
ژله میوه پوست نارنج|Fruit jelly spread bitter orange peel|249|0.3|62|0|
مارمالاد پوست نارنج|Bitter orange peel marmalade|250|0.3|62|0.1|
شیره پوست نارنج|Bitter orange peel syrup|281|0.3|70|0|
ترشی تند پوست نارنج شیرین|Sweet bitter orange peel relish|140|0.5|34|0.2|
مربای هندوانه|Watermelon preserve|258|0.4|64|0.1|
مربای هندوانه کم‌شکر|Reduced sugar watermelon preserve|163|0.5|40|0.1|
مربای هندوانه خانگی|Homemade watermelon preserve|242|0.4|60|0.1|
ژله میوه هندوانه|Fruit jelly spread watermelon|249|0.3|62|0|
مارمالاد هندوانه|Watermelon marmalade|250|0.3|62|0.1|
شیره هندوانه|Watermelon syrup|281|0.3|70|0|
ترشی تند هندوانه شیرین|Sweet watermelon relish|140|0.5|34|0.2|
مربای طالبی|Cantaloupe preserve|258|0.4|64|0.1|
مربای طالبی کم‌شکر|Reduced sugar cantaloupe preserve|163|0.5|40|0.1|
مربای طالبی خانگی|Homemade cantaloupe preserve|242|0.4|60|0.1|
ژله میوه طالبی|Fruit jelly spread cantaloupe|249|0.3|62|0|
مارمالاد طالبی|Cantaloupe marmalade|250|0.3|62|0.1|
شیره طالبی|Cantaloupe syrup|281|0.3|70|0|
ترشی تند طالبی شیرین|Sweet cantaloupe relish|140|0.5|34|0.2|
مربای کیوی|Kiwi preserve|258|0.4|64|0.1|
مربای کیوی کم‌شکر|Reduced sugar kiwi preserve|163|0.5|40|0.1|
مربای کیوی خانگی|Homemade kiwi preserve|242|0.4|60|0.1|
ژله میوه کیوی|Fruit jelly spread kiwi|249|0.3|62|0|
مارمالاد کیوی|Kiwi marmalade|250|0.3|62|0.1|
شیره کیوی|Kiwi syrup|281|0.3|70|0|
ترشی تند کیوی شیرین|Sweet kiwi relish|140|0.5|34|0.2|
مربای موز|Banana preserve|258|0.4|64|0.1|
مربای موز کم‌شکر|Reduced sugar banana preserve|163|0.5|40|0.1|
مربای موز خانگی|Homemade banana preserve|242|0.4|60|0.1|
ژله میوه موز|Fruit jelly spread banana|249|0.3|62|0|
مارمالاد موز|Banana marmalade|250|0.3|62|0.1|
شیره موز|Banana syrup|281|0.3|70|0|
ترشی تند موز شیرین|Sweet banana relish|140|0.5|34|0.2|
مربای خرمالو|Persimmon preserve|258|0.4|64|0.1|
مربای خرمالو کم‌شکر|Reduced sugar persimmon preserve|163|0.5|40|0.1|
مربای خرمالو خانگی|Homemade persimmon preserve|242|0.4|60|0.1|
ژله میوه خرمالو|Fruit jelly spread persimmon|249|0.3|62|0|
مارمالاد خرمالو|Persimmon marmalade|250|0.3|62|0.1|
شیره خرمالو|Persimmon syrup|281|0.3|70|0|
ترشی تند خرمالو شیرین|Sweet persimmon relish|140|0.5|34|0.2|
مربای گوجه سبز کم‌شکر|Reduced sugar green plum preserve|163|0.5|40|0.1|
مربای گوجه سبز خانگی|Homemade green plum preserve|242|0.4|60|0.1|
ژله میوه گوجه سبز|Fruit jelly spread green plum|249|0.3|62|0|
مارمالاد گوجه سبز|Green plum marmalade|250|0.3|62|0.1|
شیره گوجه سبز|Green plum syrup|281|0.3|70|0|
ترشی تند گوجه سبز شیرین|Sweet green plum relish|140|0.5|34|0.2|
مربای آلو کم‌شکر|Reduced sugar plum preserve|163|0.5|40|0.1|
مربای آلو خانگی|Homemade plum preserve|242|0.4|60|0.1|
ژله میوه آلو|Fruit jelly spread plum|249|0.3|62|0|
مارمالاد آلو|Plum marmalade|250|0.3|62|0.1|
شیره آلو|Plum syrup|281|0.3|70|0|
ترشی تند آلو شیرین|Sweet plum relish|140|0.5|34|0.2|
مربای شلیل|Nectarine preserve|258|0.4|64|0.1|
مربای شلیل کم‌شکر|Reduced sugar nectarine preserve|163|0.5|40|0.1|
مربای شلیل خانگی|Homemade nectarine preserve|242|0.4|60|0.1|
ژله میوه شلیل|Fruit jelly spread nectarine|249|0.3|62|0|
مارمالاد شلیل|Nectarine marmalade|250|0.3|62|0.1|
شیره شلیل|Nectarine syrup|281|0.3|70|0|
ترشی تند شلیل شیرین|Sweet nectarine relish|140|0.5|34|0.2|
مربای نارگیل|Coconut preserve|258|0.4|64|0.1|
مربای نارگیل کم‌شکر|Reduced sugar coconut preserve|163|0.5|40|0.1|
مربای نارگیل خانگی|Homemade coconut preserve|242|0.4|60|0.1|
ژله میوه نارگیل|Fruit jelly spread coconut|249|0.3|62|0|
مارمالاد نارگیل|Coconut marmalade|250|0.3|62|0.1|
شیره نارگیل|Coconut syrup|281|0.3|70|0|
ترشی تند نارگیل شیرین|Sweet coconut relish|140|0.5|34|0.2|
مربای بهارنارنج|Orange blossom preserve|258|0.4|64|0.1|
مربای بهارنارنج کم‌شکر|Reduced sugar orange blossom preserve|163|0.5|40|0.1|
مربای بهارنارنج خانگی|Homemade orange blossom preserve|242|0.4|60|0.1|
ژله میوه بهارنارنج|Fruit jelly spread orange blossom|249|0.3|62|0|
مارمالاد بهارنارنج|Orange blossom marmalade|250|0.3|62|0.1|
شیره بهارنارنج|Orange blossom syrup|281|0.3|70|0|
ترشی تند بهارنارنج شیرین|Sweet orange blossom relish|140|0.5|34|0.2|
مربای زنجبیل|Ginger preserve|258|0.4|64|0.1|
مربای زنجبیل کم‌شکر|Reduced sugar ginger preserve|163|0.5|40|0.1|
مربای زنجبیل خانگی|Homemade ginger preserve|242|0.4|60|0.1|
ژله میوه زنجبیل|Fruit jelly spread ginger|249|0.3|62|0|
مارمالاد زنجبیل|Ginger marmalade|250|0.3|62|0.1|
شیره زنجبیل|Ginger syrup|281|0.3|70|0|
ترشی تند زنجبیل شیرین|Sweet ginger relish|140|0.5|34|0.2|
مربای سیب‌زمینی شیرین|Sweet potato preserve|258|0.4|64|0.1|
مربای سیب‌زمینی شیرین کم‌شکر|Reduced sugar sweet potato preserve|163|0.5|40|0.1|
مربای سیب‌زمینی شیرین خانگی|Homemade sweet potato preserve|242|0.4|60|0.1|
ژله میوه سیب‌زمینی شیرین|Fruit jelly spread sweet potato|249|0.3|62|0|
مارمالاد سیب‌زمینی شیرین|Sweet potato marmalade|250|0.3|62|0.1|
شیره سیب‌زمینی شیرین|Sweet potato syrup|281|0.3|70|0|
ترشی تند سیب‌زمینی شیرین شیرین|Sweet sweet potato relish|140|0.5|34|0.2|
مربای پسته|Pistachio preserve|258|0.4|64|0.1|
مربای پسته کم‌شکر|Reduced sugar pistachio preserve|163|0.5|40|0.1|
مربای پسته خانگی|Homemade pistachio preserve|242|0.4|60|0.1|
ژله میوه پسته|Fruit jelly spread pistachio|249|0.3|62|0|
مارمالاد پسته|Pistachio marmalade|250|0.3|62|0.1|
شیره پسته|Pistachio syrup|281|0.3|70|0|
ترشی تند پسته شیرین|Sweet pistachio relish|140|0.5|34|0.2|
مربای ازگیل|Medlar preserve|258|0.4|64|0.1|
مربای ازگیل کم‌شکر|Reduced sugar medlar preserve|163|0.5|40|0.1|
مربای ازگیل خانگی|Homemade medlar preserve|242|0.4|60|0.1|
ژله میوه ازگیل|Fruit jelly spread medlar|249|0.3|62|0|
مارمالاد ازگیل|Medlar marmalade|250|0.3|62|0.1|
شیره ازگیل|Medlar syrup|281|0.3|70|0|
ترشی تند ازگیل شیرین|Sweet medlar relish|140|0.5|34|0.2|
مربای تمرهندی|Tamarind preserve|258|0.4|64|0.1|
مربای تمرهندی کم‌شکر|Reduced sugar tamarind preserve|163|0.5|40|0.1|
مربای تمرهندی خانگی|Homemade tamarind preserve|242|0.4|60|0.1|
ژله میوه تمرهندی|Fruit jelly spread tamarind|249|0.3|62|0|
مارمالاد تمرهندی|Tamarind marmalade|250|0.3|62|0.1|
شیره تمرهندی|Tamarind syrup|281|0.3|70|0|
ترشی تند تمرهندی شیرین|Sweet tamarind relish|140|0.5|34|0.2|
مربای لیمو شیرین|Sweet lemon preserve|258|0.4|64|0.1|
مربای لیمو شیرین کم‌شکر|Reduced sugar sweet lemon preserve|163|0.5|40|0.1|
مربای لیمو شیرین خانگی|Homemade sweet lemon preserve|242|0.4|60|0.1|
ژله میوه لیمو شیرین|Fruit jelly spread sweet lemon|249|0.3|62|0|
مارمالاد لیمو شیرین|Sweet lemon marmalade|250|0.3|62|0.1|
شیره لیمو شیرین|Sweet lemon syrup|281|0.3|70|0|
ترشی تند لیمو شیرین شیرین|Sweet sweet lemon relish|140|0.5|34|0.2|
مربای انار کم‌شکر|Reduced sugar pomegranate preserve|163|0.5|40|0.1|
مربای انار خانگی|Homemade pomegranate preserve|242|0.4|60|0.1|
ژله میوه انار|Fruit jelly spread pomegranate|249|0.3|62|0|
مارمالاد انار|Pomegranate marmalade|250|0.3|62|0.1|
شیره انار|Pomegranate syrup|281|0.3|70|0|
ترشی تند انار شیرین|Sweet pomegranate relish|140|0.5|34|0.2|
مربای نارگیل و آناناس|Coconut pineapple preserve|258|0.4|64|0.1|
مربای نارگیل و آناناس کم‌شکر|Reduced sugar coconut pineapple preserve|163|0.5|40|0.1|
مربای نارگیل و آناناس خانگی|Homemade coconut pineapple preserve|242|0.4|60|0.1|
ژله میوه نارگیل و آناناس|Fruit jelly spread coconut pineapple|249|0.3|62|0|
مارمالاد نارگیل و آناناس|Coconut pineapple marmalade|250|0.3|62|0.1|
شیره نارگیل و آناناس|Coconut pineapple syrup|281|0.3|70|0|
ترشی تند نارگیل و آناناس شیرین|Sweet coconut pineapple relish|140|0.5|34|0.2|
مربای توت‌فرنگی و موز|Strawberry banana preserve|258|0.4|64|0.1|
مربای توت‌فرنگی و موز کم‌شکر|Reduced sugar strawberry banana preserve|163|0.5|40|0.1|
مربای توت‌فرنگی و موز خانگی|Homemade strawberry banana preserve|242|0.4|60|0.1|
ژله میوه توت‌فرنگی و موز|Fruit jelly spread strawberry banana|249|0.3|62|0|
مارمالاد توت‌فرنگی و موز|Strawberry banana marmalade|250|0.3|62|0.1|
شیره توت‌فرنگی و موز|Strawberry banana syrup|281|0.3|70|0|
ترشی تند توت‌فرنگی و موز شیرین|Sweet strawberry banana relish|140|0.5|34|0.2|
مربای آلبالو و گیلاس|Sour cherry and cherry preserve|258|0.4|64|0.1|
مربای آلبالو و گیلاس کم‌شکر|Reduced sugar sour cherry and cherry preserve|163|0.5|40|0.1|
مربای آلبالو و گیلاس خانگی|Homemade sour cherry and cherry preserve|242|0.4|60|0.1|
ژله میوه آلبالو و گیلاس|Fruit jelly spread sour cherry and cherry|249|0.3|62|0|
مارمالاد آلبالو و گیلاس|Sour cherry and cherry marmalade|250|0.3|62|0.1|
شیره آلبالو و گیلاس|Sour cherry and cherry syrup|281|0.3|70|0|
ترشی تند آلبالو و گیلاس شیرین|Sweet sour cherry and cherry relish|140|0.5|34|0.2|
مربای سیب و دارچین|Apple cinnamon preserve|258|0.4|64|0.1|
مربای سیب و دارچین کم‌شکر|Reduced sugar apple cinnamon preserve|163|0.5|40|0.1|
مربای سیب و دارچین خانگی|Homemade apple cinnamon preserve|242|0.4|60|0.1|
ژله میوه سیب و دارچین|Fruit jelly spread apple cinnamon|249|0.3|62|0|
مارمالاد سیب و دارچین|Apple cinnamon marmalade|250|0.3|62|0.1|
شیره سیب و دارچین|Apple cinnamon syrup|281|0.3|70|0|
ترشی تند سیب و دارچین شیرین|Sweet apple cinnamon relish|140|0.5|34|0.2|
شیره شکر|Sugar syrup|272|0|68|0|
دوشاب انگور|Grape doushab|292|1|72|0|
دوشاب خرما|Date doushab|292|1|72|0|
شیره شیرین‌بیان|Licorice syrup|242|0.5|60|0|
شیره زعفران|Saffron syrup|264|0|66|0|
شیره قند|Sugar cane syrup|280|0|70|0|
شیره افرا ساده|Pure maple syrup|269|0|67|0.1|
گلوکز مایع|Liquid glucose|312|0|78|0|
شیره عسل|Honey syrup|305|0.2|76|0|
عسل گون|Gon honey|330|0.4|82|0|
عسل کنار|Sidr honey|330|0.4|82|0|
عسل آویشن|Thyme honey|330|0.4|82|0|
عسل چندگل|Multiflora honey|330|0.4|82|0|
عسل مرکبات|Citrus honey|330|0.4|82|0|
عسل بهارنارنج|Orange blossom honey|330|0.4|82|0|
عسل کرمی|Creamed honey|330|0.4|82|0|
عسل کوهی|Mountain honey|330|0.4|82|0|
عسل با پسته|Honey with pistachios|400|4|60|16|
عسل با بادام|Honey with almonds|382|4|60|14|
عسل با زعفران|Honey with saffron|330|0.4|82|0|
عسل با گرده گل|Honey with bee pollen|328|1|80|0.5|
عسل با ژل رویال|Honey with royal jelly|328|1|80|0.5|
شکلات صبحانه نوتلا|Nutella-style hazelnut spread|535|6|58|31|نوتلا
شکلات صبحانه فندقی|Hazelnut chocolate spread|536|6|56|32|
شکلات صبحانه کاکائویی|Cocoa chocolate spread|526|4|60|30|
شکلات صبحانه سفید|White chocolate spread|532|5|56|32|
شکلات صبحانه دو رنگ|Duo chocolate spread|527|5|57|31|
شکلات صبحانه کم‌شیرین|Low sugar chocolate spread|510|8|34|38|
شکلات صبحانه بادام‌زمینی|Peanut chocolate spread|534|9|48|34|
شکلات صبحانه پسته|Pistachio chocolate spread|538|8|50|34|
شکلات صبحانه نارگیلی|Coconut chocolate spread|542|5|54|34|
شکلات صبحانه پروتئینی|Protein chocolate spread|438|22|20|30|
شکلات صبحانه کارامل|Caramel chocolate spread|512|5|60|28|
شکلات صبحانه قهوه|Coffee chocolate spread|522|5|58|30|
کره آفتابگردان|Sunflower seed butter|647|18|20|55|
کره بادام‌زمینی کرمی|Creamy peanut butter|630|25|20|50|
کره بادام‌زمینی کرانچی|Crunchy peanut butter|630|25|20|50|
کره بادام‌زمینی شکلاتی|Chocolate peanut butter|588|20|28|44|
کره بادام‌زمینی عسلی|Honey peanut butter|578|22|28|42|
کره کاکائو|Cocoa butter|900|0|0|100|
ارده شیره|Tahini with grape molasses|374|9|44|18|
ارده شیره خرما|Tahini with date syrup|374|9|44|18|
ارده ساده|Plain tahini|642|17|22|54|
ارده شکلاتی|Chocolate tahini|512|11|36|36|
ارده عسلی|Honey tahini|494|11|36|34|
حلوا ارده شیرین|Sweet halva tahini spread|516|13|44|32|
کرم کنجدی|Sesame spread|572|14|30|44|
کرم فندقی|Hazelnut cream|528|6|54|32|
کرم پسته|Pistachio cream|552|8|40|40|
کرم وانیلی|Vanilla cream filling|274|3|34|14|
کرم شکلاتی|Chocolate cream filling|414|4|50|22|
کرم لوتوس|Lotus spread|452|3|56|24|
خامه فرم‌گرفته|Whipped cream|330|2|13|30|
خامه ژلاتینی|Gelatin cream|256|3|16|20|
خامه صبحانه با عسل|Cream with honey|380|2|30|28|
خامه عسل|Cream and honey|370|2|32|26|
خامه گاوی تازه|Fresh cow cream|290|2|3|30|
کره عسل|Honey butter|447|0.3|26|38|
کره شکلاتی صبحانه|Chocolate butter|518|1|16|50|
فرمانده|Spreadable cheese sweet|280|5|20|20|
لاته با شیر کامل|Latte with whole milk|44|2.4|3.5|2.3|
لاته با شیر کم‌چرب|Latte with skim milk|24|2.4|3.5|0.1|
لاته با شیر نیم‌چرب|Latte with 2% milk|36|2.4|3.5|1.4|
لاته با شیر بادام|Latte with almond milk|11|0.3|0.6|0.8|
لاته با شیر سویا|Latte with soy milk|26|2|1.8|1.3|
لاته با شیر جو دوسر|Latte with oat milk|30|0.7|4.5|1|
لاته با شیر نارگیل|Latte with coconut milk drink|14|0.1|1|1|
لاته با شیر برنج|Latte with rice milk|32|0.2|6.3|0.6|
لاته با شیر فندق|Latte with hazelnut milk|18|0.4|2.1|0.9|
لاته با شیر کاجو|Latte with cashew milk|16|0.6|1|1|
لاته با شیر بدون لاکتوز|Latte with lactose-free milk|43|2.4|3.4|2.2|
لاته با شیر بز|Latte with goat milk|49|2.5|3.1|2.9|
لاته با شیر شتر|Latte with camel milk|43|2.2|3.1|2.4|
لاته با شیر گردو|Latte with walnut milk|15|0.6|0.6|1.1|
لاته با شیر پسته|Latte with pistachio milk|23|0.8|2.1|1.3|
کاپوچینو با شیر کامل|Cappuccino with whole milk|32|1.7|2.5|1.6|
کاپوچینو با شیر کم‌چرب|Cappuccino with skim milk|17|1.7|2.5|0.1|
کاپوچینو با شیر نیم‌چرب|Cappuccino with 2% milk|26|1.7|2.5|1|
کاپوچینو با شیر بادام|Cappuccino with almond milk|8|0.2|0.4|0.6|
کاپوچینو با شیر سویا|Cappuccino with soy milk|19|1.4|1.2|0.9|
کاپوچینو با شیر جو دوسر|Cappuccino with oat milk|21|0.5|3.2|0.7|
کاپوچینو با شیر نارگیل|Cappuccino with coconut milk drink|10|0.1|0.8|0.8|
کاپوچینو با شیر برنج|Cappuccino with rice milk|23|0.1|4.5|0.5|
کاپوچینو با شیر فندق|Cappuccino with hazelnut milk|13|0.3|1.5|0.7|
کاپوچینو با شیر کاجو|Cappuccino with cashew milk|11|0.4|0.8|0.8|
کاپوچینو با شیر بدون لاکتوز|Cappuccino with lactose-free milk|31|1.7|2.4|1.6|
کاپوچینو با شیر بز|Cappuccino with goat milk|35|1.8|2.2|2|
کاپوچینو با شیر شتر|Cappuccino with camel milk|31|1.6|2.2|1.8|
کاپوچینو با شیر گردو|Cappuccino with walnut milk|11|0.5|0.4|0.8|
کاپوچینو با شیر پسته|Cappuccino with pistachio milk|16|0.6|1.5|0.9|
فلت وایت با شیر کامل|Flat white with whole milk|47|2.5|3.8|2.5|
فلت وایت با شیر کم‌چرب|Flat white with skim milk|26|2.5|3.8|0.1|
فلت وایت با شیر نیم‌چرب|Flat white with 2% milk|39|2.5|3.8|1.5|
فلت وایت با شیر بادام|Flat white with almond milk|12|0.4|0.6|0.9|
فلت وایت با شیر سویا|Flat white with soy milk|28|2.2|1.9|1.4|
فلت وایت با شیر جو دوسر|Flat white with oat milk|32|0.8|4.9|1|
فلت وایت با شیر نارگیل|Flat white with coconut milk drink|15|0.2|1.1|1.1|
فلت وایت با شیر برنج|Flat white with rice milk|34|0.2|6.8|0.7|
فلت وایت با شیر فندق|Flat white with hazelnut milk|20|0.4|2.2|1|
فلت وایت با شیر کاجو|Flat white with cashew milk|17|0.6|1.1|1.1|
فلت وایت با شیر بدون لاکتوز|Flat white with lactose-free milk|46|2.5|3.6|2.4|
فلت وایت با شیر بز|Flat white with goat milk|52|2.7|3.4|3.1|
فلت وایت با شیر شتر|Flat white with camel milk|46|2.3|3.3|2.6|
فلت وایت با شیر گردو|Flat white with walnut milk|16|0.7|0.6|1.2|
فلت وایت با شیر پسته|Flat white with pistachio milk|25|0.9|2.2|1.4|
کورتادو با شیر کامل|Cortado with whole milk|32|1.7|2.5|1.6|
کورتادو با شیر کم‌چرب|Cortado with skim milk|17|1.7|2.5|0.1|
کورتادو با شیر نیم‌چرب|Cortado with 2% milk|26|1.7|2.5|1|
کورتادو با شیر بادام|Cortado with almond milk|8|0.2|0.4|0.6|
کورتادو با شیر سویا|Cortado with soy milk|19|1.4|1.2|0.9|
کورتادو با شیر جو دوسر|Cortado with oat milk|21|0.5|3.2|0.7|
کورتادو با شیر نارگیل|Cortado with coconut milk drink|10|0.1|0.8|0.8|
کورتادو با شیر برنج|Cortado with rice milk|23|0.1|4.5|0.5|
کورتادو با شیر فندق|Cortado with hazelnut milk|13|0.3|1.5|0.7|
کورتادو با شیر کاجو|Cortado with cashew milk|11|0.4|0.8|0.8|
کورتادو با شیر بدون لاکتوز|Cortado with lactose-free milk|31|1.7|2.4|1.6|
کورتادو با شیر بز|Cortado with goat milk|35|1.8|2.2|2|
کورتادو با شیر شتر|Cortado with camel milk|31|1.6|2.2|1.8|
کورتادو با شیر گردو|Cortado with walnut milk|11|0.5|0.4|0.8|
کورتادو با شیر پسته|Cortado with pistachio milk|16|0.6|1.5|0.9|
ماکیاتو با شیر کامل|Macchiato with whole milk|9|0.5|0.8|0.5|
ماکیاتو با شیر کم‌چرب|Macchiato with skim milk|5|0.5|0.8|0|
ماکیاتو با شیر نیم‌چرب|Macchiato with 2% milk|8|0.5|0.8|0.3|
ماکیاتو با شیر بادام|Macchiato with almond milk|2|0.1|0.1|0.2|
ماکیاتو با شیر سویا|Macchiato with soy milk|6|0.4|0.4|0.3|
ماکیاتو با شیر جو دوسر|Macchiato with oat milk|6|0.1|1|0.2|
ماکیاتو با شیر نارگیل|Macchiato with coconut milk drink|3|0|0.2|0.2|
ماکیاتو با شیر برنج|Macchiato with rice milk|7|0|1.3|0.1|
ماکیاتو با شیر فندق|Macchiato with hazelnut milk|4|0.1|0.4|0.2|
ماکیاتو با شیر کاجو|Macchiato with cashew milk|3|0.1|0.2|0.2|
ماکیاتو با شیر بدون لاکتوز|Macchiato with lactose-free milk|9|0.5|0.7|0.5|
ماکیاتو با شیر بز|Macchiato with goat milk|10|0.5|0.7|0.6|
ماکیاتو با شیر شتر|Macchiato with camel milk|9|0.5|0.7|0.5|
ماکیاتو با شیر گردو|Macchiato with walnut milk|3|0.1|0.1|0.2|
ماکیاتو با شیر پسته|Macchiato with pistachio milk|5|0.2|0.4|0.3|
لاته ماکیاتو با شیر کامل|Latte macchiato with whole milk|47|2.5|3.8|2.5|
لاته ماکیاتو با شیر کم‌چرب|Latte macchiato with skim milk|26|2.5|3.8|0.1|
لاته ماکیاتو با شیر نیم‌چرب|Latte macchiato with 2% milk|39|2.5|3.8|1.5|
لاته ماکیاتو با شیر بادام|Latte macchiato with almond milk|12|0.4|0.6|0.9|
لاته ماکیاتو با شیر سویا|Latte macchiato with soy milk|28|2.2|1.9|1.4|
لاته ماکیاتو با شیر جو دوسر|Latte macchiato with oat milk|32|0.8|4.9|1|
لاته ماکیاتو با شیر نارگیل|Latte macchiato with coconut milk drink|15|0.2|1.1|1.1|
لاته ماکیاتو با شیر برنج|Latte macchiato with rice milk|34|0.2|6.8|0.7|
لاته ماکیاتو با شیر فندق|Latte macchiato with hazelnut milk|20|0.4|2.2|1|
لاته ماکیاتو با شیر کاجو|Latte macchiato with cashew milk|17|0.6|1.1|1.1|
لاته ماکیاتو با شیر بدون لاکتوز|Latte macchiato with lactose-free milk|46|2.5|3.6|2.4|
لاته ماکیاتو با شیر بز|Latte macchiato with goat milk|52|2.7|3.4|3.1|
لاته ماکیاتو با شیر شتر|Latte macchiato with camel milk|46|2.3|3.3|2.6|
لاته ماکیاتو با شیر گردو|Latte macchiato with walnut milk|16|0.7|0.6|1.2|
لاته ماکیاتو با شیر پسته|Latte macchiato with pistachio milk|25|0.9|2.2|1.4|
موکا با شیر کامل|Mocha with whole milk|64|2|9.5|2|
موکا با شیر کم‌چرب|Mocha with skim milk|47|2|9.5|0.1|
موکا با شیر نیم‌چرب|Mocha with 2% milk|57|2|9.5|1.2|
موکا با شیر بادام|Mocha with almond milk|36|0.3|7|0.7|
موکا با شیر سویا|Mocha with soy milk|49|1.7|8|1.1|
موکا با شیر جو دوسر|Mocha with oat milk|52|0.6|10.4|0.8|
موکا با شیر نارگیل|Mocha with coconut milk drink|38|0.1|7.4|0.9|
موکا با شیر برنج|Mocha with rice milk|53|0.2|11.9|0.5|
موکا با شیر فندق|Mocha with hazelnut milk|42|0.4|8.3|0.8|
موکا با شیر کاجو|Mocha with cashew milk|40|0.5|7.4|0.9|
موکا با شیر بدون لاکتوز|Mocha with lactose-free milk|63|2|9.4|1.9|
موکا با شیر بز|Mocha with goat milk|68|2.2|9.2|2.5|
موکا با شیر شتر|Mocha with camel milk|63|1.9|9.1|2.1|
موکا با شیر گردو|Mocha with walnut milk|39|0.5|7|1|
موکا با شیر پسته|Mocha with pistachio milk|46|0.7|8.3|1.1|
وایت موکا با شیر کامل|White mocha with whole milk|70|2|11|2|
وایت موکا با شیر کم‌چرب|White mocha with skim milk|53|2|11|0.1|
وایت موکا با شیر نیم‌چرب|White mocha with 2% milk|63|2|11|1.2|
وایت موکا با شیر بادام|White mocha with almond milk|42|0.3|8.5|0.7|
وایت موکا با شیر سویا|White mocha with soy milk|55|1.7|9.5|1.1|
وایت موکا با شیر جو دوسر|White mocha with oat milk|58|0.6|11.9|0.8|
وایت موکا با شیر نارگیل|White mocha with coconut milk drink|44|0.1|8.9|0.9|
وایت موکا با شیر برنج|White mocha with rice milk|59|0.2|13.4|0.5|
وایت موکا با شیر فندق|White mocha with hazelnut milk|48|0.4|9.8|0.8|
وایت موکا با شیر کاجو|White mocha with cashew milk|46|0.5|8.9|0.9|
وایت موکا با شیر بدون لاکتوز|White mocha with lactose-free milk|69|2|10.9|1.9|
وایت موکا با شیر بز|White mocha with goat milk|74|2.2|10.7|2.5|
وایت موکا با شیر شتر|White mocha with camel milk|69|1.9|10.6|2.1|
وایت موکا با شیر گردو|White mocha with walnut milk|45|0.5|8.5|1|
وایت موکا با شیر پسته|White mocha with pistachio milk|52|0.7|9.8|1.1|
آمریکانو با شیر با شیر کامل|Americano with milk with whole milk|9|0.5|0.8|0.5|
آمریکانو با شیر با شیر کم‌چرب|Americano with milk with skim milk|5|0.5|0.8|0|
آمریکانو با شیر با شیر نیم‌چرب|Americano with milk with 2% milk|8|0.5|0.8|0.3|
آمریکانو با شیر با شیر بادام|Americano with milk with almond milk|2|0.1|0.1|0.2|
آمریکانو با شیر با شیر سویا|Americano with milk with soy milk|6|0.4|0.4|0.3|
آمریکانو با شیر با شیر جو دوسر|Americano with milk with oat milk|6|0.1|1|0.2|
آمریکانو با شیر با شیر نارگیل|Americano with milk with coconut milk drink|3|0|0.2|0.2|
آمریکانو با شیر با شیر برنج|Americano with milk with rice milk|7|0|1.3|0.1|
آمریکانو با شیر با شیر فندق|Americano with milk with hazelnut milk|4|0.1|0.4|0.2|
آمریکانو با شیر با شیر کاجو|Americano with milk with cashew milk|3|0.1|0.2|0.2|
آمریکانو با شیر با شیر بدون لاکتوز|Americano with milk with lactose-free milk|9|0.5|0.7|0.5|
آمریکانو با شیر با شیر بز|Americano with milk with goat milk|10|0.5|0.7|0.6|
آمریکانو با شیر با شیر شتر|Americano with milk with camel milk|9|0.5|0.7|0.5|
آمریکانو با شیر با شیر گردو|Americano with milk with walnut milk|3|0.1|0.1|0.2|
آمریکانو با شیر با شیر پسته|Americano with milk with pistachio milk|5|0.2|0.4|0.3|
کافه او لائه با شیر کامل|Cafe au lait with whole milk|32|1.7|2.5|1.6|
کافه او لائه با شیر کم‌چرب|Cafe au lait with skim milk|17|1.7|2.5|0.1|
کافه او لائه با شیر نیم‌چرب|Cafe au lait with 2% milk|26|1.7|2.5|1|
کافه او لائه با شیر بادام|Cafe au lait with almond milk|8|0.2|0.4|0.6|
کافه او لائه با شیر سویا|Cafe au lait with soy milk|19|1.4|1.2|0.9|
کافه او لائه با شیر جو دوسر|Cafe au lait with oat milk|21|0.5|3.2|0.7|
کافه او لائه با شیر نارگیل|Cafe au lait with coconut milk drink|10|0.1|0.8|0.8|
کافه او لائه با شیر برنج|Cafe au lait with rice milk|23|0.1|4.5|0.5|
کافه او لائه با شیر فندق|Cafe au lait with hazelnut milk|13|0.3|1.5|0.7|
کافه او لائه با شیر کاجو|Cafe au lait with cashew milk|11|0.4|0.8|0.8|
کافه او لائه با شیر بدون لاکتوز|Cafe au lait with lactose-free milk|31|1.7|2.4|1.6|
کافه او لائه با شیر بز|Cafe au lait with goat milk|35|1.8|2.2|2|
کافه او لائه با شیر شتر|Cafe au lait with camel milk|31|1.6|2.2|1.8|
کافه او لائه با شیر گردو|Cafe au lait with walnut milk|11|0.5|0.4|0.8|
کافه او لائه با شیر پسته|Cafe au lait with pistachio milk|16|0.6|1.5|0.9|
لاته یخ با شیر کامل|Iced latte with whole milk|35|1.9|2.8|1.8|
لاته یخ با شیر کم‌چرب|Iced latte with skim milk|19|1.9|2.8|0.1|
لاته یخ با شیر نیم‌چرب|Iced latte with 2% milk|28|1.9|2.8|1.1|
لاته یخ با شیر بادام|Iced latte with almond milk|9|0.3|0.4|0.7|
لاته یخ با شیر سویا|Iced latte with soy milk|21|1.6|1.4|1|
لاته یخ با شیر جو دوسر|Iced latte with oat milk|23|0.6|3.6|0.8|
لاته یخ با شیر نارگیل|Iced latte with coconut milk drink|11|0.1|0.8|0.8|
لاته یخ با شیر برنج|Iced latte with rice milk|25|0.2|5|0.5|
لاته یخ با شیر فندق|Iced latte with hazelnut milk|14|0.3|1.7|0.7|
لاته یخ با شیر کاجو|Iced latte with cashew milk|12|0.4|0.8|0.8|
لاته یخ با شیر بدون لاکتوز|Iced latte with lactose-free milk|34|1.9|2.6|1.8|
لاته یخ با شیر بز|Iced latte with goat milk|38|2|2.5|2.3|
لاته یخ با شیر شتر|Iced latte with camel milk|34|1.7|2.4|1.9|
لاته یخ با شیر گردو|Iced latte with walnut milk|12|0.5|0.4|0.9|
لاته یخ با شیر پسته|Iced latte with pistachio milk|18|0.7|1.7|1|
کاپوچینو یخ با شیر کامل|Iced cappuccino with whole milk|28|1.5|2.2|1.5|
کاپوچینو یخ با شیر کم‌چرب|Iced cappuccino with skim milk|16|1.5|2.2|0|
کاپوچینو یخ با شیر نیم‌چرب|Iced cappuccino with 2% milk|23|1.5|2.2|0.9|
کاپوچینو یخ با شیر بادام|Iced cappuccino with almond milk|7|0.2|0.4|0.5|
کاپوچینو یخ با شیر سویا|Iced cappuccino with soy milk|17|1.3|1.1|0.8|
کاپوچینو یخ با شیر جو دوسر|Iced cappuccino with oat milk|19|0.5|2.9|0.6|
کاپوچینو یخ با شیر نارگیل|Iced cappuccino with coconut milk drink|9|0.1|0.7|0.7|
کاپوچینو یخ با شیر برنج|Iced cappuccino with rice milk|20|0.1|4|0.4|
کاپوچینو یخ با شیر فندق|Iced cappuccino with hazelnut milk|12|0.3|1.4|0.6|
کاپوچینو یخ با شیر کاجو|Iced cappuccino with cashew milk|10|0.4|0.7|0.7|
کاپوچینو یخ با شیر بدون لاکتوز|Iced cappuccino with lactose-free milk|28|1.5|2.2|1.4|
کاپوچینو یخ با شیر بز|Iced cappuccino with goat milk|31|1.6|2|1.8|
کاپوچینو یخ با شیر شتر|Iced cappuccino with camel milk|28|1.4|2|1.6|
کاپوچینو یخ با شیر گردو|Iced cappuccino with walnut milk|10|0.4|0.4|0.7|
کاپوچینو یخ با شیر پسته|Iced cappuccino with pistachio milk|15|0.5|1.4|0.8|
موکا یخ با شیر کامل|Iced mocha with whole milk|58|1.7|9|1.6|
موکا یخ با شیر کم‌چرب|Iced mocha with skim milk|43|1.7|9|0.1|
موکا یخ با شیر نیم‌چرب|Iced mocha with 2% milk|52|1.7|9|1|
موکا یخ با شیر بادام|Iced mocha with almond milk|34|0.2|6.9|0.6|
موکا یخ با شیر سویا|Iced mocha with soy milk|45|1.4|7.8|0.9|
موکا یخ با شیر جو دوسر|Iced mocha with oat milk|47|0.5|9.8|0.7|
موکا یخ با شیر نارگیل|Iced mocha with coconut milk drink|36|0.1|7.2|0.8|
موکا یخ با شیر برنج|Iced mocha with rice milk|49|0.1|11|0.5|
موکا یخ با شیر فندق|Iced mocha with hazelnut milk|39|0.3|8|0.7|
موکا یخ با شیر کاجو|Iced mocha with cashew milk|37|0.4|7.2|0.8|
موکا یخ با شیر بدون لاکتوز|Iced mocha with lactose-free milk|57|1.7|8.9|1.6|
موکا یخ با شیر بز|Iced mocha with goat milk|61|1.8|8.8|2|
موکا یخ با شیر شتر|Iced mocha with camel milk|57|1.6|8.7|1.8|
موکا یخ با شیر گردو|Iced mocha with walnut milk|37|0.5|6.9|0.8|
موکا یخ با شیر پسته|Iced mocha with pistachio milk|42|0.6|8|0.9|
فلت وایت یخ با شیر کامل|Iced flat white with whole milk|38|2|3|2|
فلت وایت یخ با شیر کم‌چرب|Iced flat white with skim milk|21|2|3|0.1|
فلت وایت یخ با شیر نیم‌چرب|Iced flat white with 2% milk|31|2|3|1.2|
فلت وایت یخ با شیر بادام|Iced flat white with almond milk|10|0.3|0.5|0.7|
فلت وایت یخ با شیر سویا|Iced flat white with soy milk|23|1.7|1.5|1.1|
فلت وایت یخ با شیر جو دوسر|Iced flat white with oat milk|26|0.6|3.9|0.8|
فلت وایت یخ با شیر نارگیل|Iced flat white with coconut milk drink|12|0.1|0.9|0.9|
فلت وایت یخ با شیر برنج|Iced flat white with rice milk|27|0.2|5.4|0.5|
فلت وایت یخ با شیر فندق|Iced flat white with hazelnut milk|16|0.4|1.8|0.8|
فلت وایت یخ با شیر کاجو|Iced flat white with cashew milk|14|0.5|0.9|0.9|
فلت وایت یخ با شیر بدون لاکتوز|Iced flat white with lactose-free milk|37|2|2.9|1.9|
فلت وایت یخ با شیر بز|Iced flat white with goat milk|42|2.2|2.7|2.5|
فلت وایت یخ با شیر شتر|Iced flat white with camel milk|37|1.9|2.6|2.1|
فلت وایت یخ با شیر گردو|Iced flat white with walnut milk|13|0.5|0.5|1|
فلت وایت یخ با شیر پسته|Iced flat white with pistachio milk|20|0.7|1.8|1.1|
ماچا لاته با شیر کامل|Matcha latte with whole milk|63|2.7|7|2.6|
ماچا لاته با شیر کم‌چرب|Matcha latte with skim milk|40|2.7|7|0.1|
ماچا لاته با شیر نیم‌چرب|Matcha latte with 2% milk|53|2.7|7|1.6|
ماچا لاته با شیر بادام|Matcha latte with almond milk|25|0.4|3.6|1|
ماچا لاته با شیر سویا|Matcha latte with soy milk|42|2.3|5|1.4|
ماچا لاته با شیر جو دوسر|Matcha latte with oat milk|46|0.8|8.2|1.1|
ماچا لاته با شیر نارگیل|Matcha latte with coconut milk drink|28|0.2|4.2|1.2|
ماچا لاته با شیر برنج|Matcha latte with rice milk|48|0.2|10.2|0.7|
ماچا لاته با شیر فندق|Matcha latte with hazelnut milk|33|0.5|5.4|1|
ماچا لاته با شیر کاجو|Matcha latte with cashew milk|30|0.6|4.2|1.2|
ماچا لاته با شیر بدون لاکتوز|Matcha latte with lactose-free milk|61|2.7|6.8|2.6|
ماچا لاته با شیر بز|Matcha latte with goat milk|67|2.9|6.6|3.3|
ماچا لاته با شیر شتر|Matcha latte with camel milk|61|2.5|6.5|2.8|
ماچا لاته با شیر گردو|Matcha latte with walnut milk|29|0.7|3.6|1.3|
ماچا لاته با شیر پسته|Matcha latte with pistachio milk|38|1|5.4|1.4|
چای لاته با شیر کامل|Chai latte with whole milk|63|2.5|7.8|2.5|
چای لاته با شیر کم‌چرب|Chai latte with skim milk|42|2.5|7.8|0.1|
چای لاته با شیر نیم‌چرب|Chai latte with 2% milk|55|2.5|7.8|1.5|
چای لاته با شیر بادام|Chai latte with almond milk|28|0.4|4.6|0.9|
چای لاته با شیر سویا|Chai latte with soy milk|44|2.2|5.9|1.4|
چای لاته با شیر جو دوسر|Chai latte with oat milk|48|0.8|8.9|1|
چای لاته با شیر نارگیل|Chai latte with coconut milk drink|31|0.2|5.1|1.1|
چای لاته با شیر برنج|Chai latte with rice milk|50|0.2|10.8|0.7|
چای لاته با شیر فندق|Chai latte with hazelnut milk|36|0.4|6.2|1|
چای لاته با شیر کاجو|Chai latte with cashew milk|33|0.6|5.1|1.1|
چای لاته با شیر بدون لاکتوز|Chai latte with lactose-free milk|62|2.5|7.6|2.4|
چای لاته با شیر بز|Chai latte with goat milk|68|2.7|7.4|3.1|
چای لاته با شیر شتر|Chai latte with camel milk|62|2.3|7.3|2.6|
چای لاته با شیر گردو|Chai latte with walnut milk|32|0.7|4.6|1.2|
چای لاته با شیر پسته|Chai latte with pistachio milk|41|0.9|6.2|1.4|
چای ماسالا با شیر کامل|Masala chai with whole milk|58|2.4|7|2.3|
چای ماسالا با شیر کم‌چرب|Masala chai with skim milk|38|2.4|7|0.1|
چای ماسالا با شیر نیم‌چرب|Masala chai with 2% milk|50|2.4|7|1.4|
چای ماسالا با شیر بادام|Masala chai with almond milk|25|0.3|4.1|0.8|
چای ماسالا با شیر سویا|Masala chai with soy milk|40|2|5.2|1.3|
چای ماسالا با شیر جو دوسر|Masala chai with oat milk|44|0.7|8.1|1|
چای ماسالا با شیر نارگیل|Masala chai with coconut milk drink|28|0.1|4.5|1|
چای ماسالا با شیر برنج|Masala chai with rice milk|46|0.2|9.8|0.6|
چای ماسالا با شیر فندق|Masala chai with hazelnut milk|32|0.4|5.6|0.9|
چای ماسالا با شیر کاجو|Masala chai with cashew milk|30|0.6|4.5|1|
چای ماسالا با شیر بدون لاکتوز|Masala chai with lactose-free milk|57|2.4|6.9|2.2|
چای ماسالا با شیر بز|Masala chai with goat milk|63|2.5|6.7|2.9|
چای ماسالا با شیر شتر|Masala chai with camel milk|57|2.2|6.6|2.4|
چای ماسالا با شیر گردو|Masala chai with walnut milk|29|0.6|4.1|1.1|
چای ماسالا با شیر پسته|Masala chai with pistachio milk|37|0.8|5.6|1.3|
کارامل ماکیاتو با شیر کامل|Caramel macchiato with whole milk|61|2.2|8.2|2.1|
کارامل ماکیاتو با شیر کم‌چرب|Caramel macchiato with skim milk|42|2.2|8.2|0.1|
کارامل ماکیاتو با شیر نیم‌چرب|Caramel macchiato with 2% milk|54|2.2|8.2|1.3|
کارامل ماکیاتو با شیر بادام|Caramel macchiato with almond milk|30|0.3|5.5|0.8|
کارامل ماکیاتو با شیر سویا|Caramel macchiato with soy milk|45|1.9|6.6|1.2|
کارامل ماکیاتو با شیر جو دوسر|Caramel macchiato with oat milk|48|0.7|9.2|0.9|
کارامل ماکیاتو با شیر نارگیل|Caramel macchiato with coconut milk drink|33|0.1|6|1|
کارامل ماکیاتو با شیر برنج|Caramel macchiato with rice milk|49|0.2|10.9|0.6|
کارامل ماکیاتو با شیر فندق|Caramel macchiato with hazelnut milk|37|0.4|7|0.8|
کارامل ماکیاتو با شیر کاجو|Caramel macchiato with cashew milk|35|0.5|6|1|
کارامل ماکیاتو با شیر بدون لاکتوز|Caramel macchiato with lactose-free milk|60|2.2|8.1|2.1|
کارامل ماکیاتو با شیر بز|Caramel macchiato with goat milk|65|2.3|7.9|2.7|
کارامل ماکیاتو با شیر شتر|Caramel macchiato with camel milk|60|2|7.9|2.3|
کارامل ماکیاتو با شیر گردو|Caramel macchiato with walnut milk|34|0.6|5.5|1|
کارامل ماکیاتو با شیر پسته|Caramel macchiato with pistachio milk|41|0.8|7|1.2|
اسپرسو کانپانا با شیر کامل|Espresso con panna with whole milk|3|0.2|0.2|0.2|
اسپرسو کانپانا با شیر کم‌چرب|Espresso con panna with skim milk|2|0.2|0.2|0|
اسپرسو کانپانا با شیر نیم‌چرب|Espresso con panna with 2% milk|3|0.2|0.2|0.1|
اسپرسو کانپانا با شیر بادام|Espresso con panna with almond milk|1|0|0|0.1|
اسپرسو کانپانا با شیر سویا|Espresso con panna with soy milk|2|0.1|0.1|0.1|
اسپرسو کانپانا با شیر جو دوسر|Espresso con panna with oat milk|2|0.1|0.3|0.1|
اسپرسو کانپانا با شیر نارگیل|Espresso con panna with coconut milk drink|1|0|0.1|0.1|
اسپرسو کانپانا با شیر برنج|Espresso con panna with rice milk|2|0|0.5|0|
اسپرسو کانپانا با شیر فندق|Espresso con panna with hazelnut milk|1|0|0.2|0.1|
اسپرسو کانپانا با شیر کاجو|Espresso con panna with cashew milk|1|0|0.1|0.1|
اسپرسو کانپانا با شیر بدون لاکتوز|Espresso con panna with lactose-free milk|3|0.2|0.2|0.2|
اسپرسو کانپانا با شیر بز|Espresso con panna with goat milk|3|0.2|0.2|0.2|
اسپرسو کانپانا با شیر شتر|Espresso con panna with camel milk|3|0.2|0.2|0.2|
اسپرسو کانپانا با شیر گردو|Espresso con panna with walnut milk|1|0|0|0.1|
اسپرسو کانپانا با شیر پسته|Espresso con panna with pistachio milk|2|0.1|0.2|0.1|
هات چاکلت با شیر کامل|Hot chocolate with whole milk|82|2.9|11.2|2.8|
هات چاکلت با شیر کم‌چرب|Hot chocolate with skim milk|57|2.9|11.2|0.1|
هات چاکلت با شیر نیم‌چرب|Hot chocolate with 2% milk|72|2.9|11.2|1.7|
هات چاکلت با شیر بادام|Hot chocolate with almond milk|42|0.4|7.7|1|
هات چاکلت با شیر سویا|Hot chocolate with soy milk|60|2.5|9.1|1.5|
هات چاکلت با شیر جو دوسر|Hot chocolate with oat milk|64|0.8|12.5|1.2|
هات چاکلت با شیر نارگیل|Hot chocolate with coconut milk drink|45|0.2|8.3|1.3|
هات چاکلت با شیر برنج|Hot chocolate with rice milk|67|0.3|14.6|0.8|
هات چاکلت با شیر فندق|Hot chocolate with hazelnut milk|50|0.5|9.6|1.1|
هات چاکلت با شیر کاجو|Hot chocolate with cashew milk|47|0.7|8.3|1.3|
هات چاکلت با شیر بدون لاکتوز|Hot chocolate with lactose-free milk|80|2.9|11.1|2.7|
هات چاکلت با شیر بز|Hot chocolate with goat milk|87|3.1|10.8|3.5|
هات چاکلت با شیر شتر|Hot chocolate with camel milk|80|2.6|10.7|3|
هات چاکلت با شیر گردو|Hot chocolate with walnut milk|46|0.8|7.7|1.4|
هات چاکلت با شیر پسته|Hot chocolate with pistachio milk|56|1|9.6|1.5|
کاکائو داغ با شیر کامل|Hot cocoa with whole milk|82|3|10.9|2.9|
کاکائو داغ با شیر کم‌چرب|Hot cocoa with skim milk|56|3|10.9|0.1|
کاکائو داغ با شیر نیم‌چرب|Hot cocoa with 2% milk|71|3|10.9|1.8|
کاکائو داغ با شیر بادام|Hot cocoa with almond milk|40|0.4|7.2|1.1|
کاکائو داغ با شیر سویا|Hot cocoa with soy milk|59|2.6|8.7|1.6|
کاکائو داغ با شیر جو دوسر|Hot cocoa with oat milk|63|0.9|12.2|1.2|
کاکائو داغ با شیر نارگیل|Hot cocoa with coconut milk drink|44|0.2|7.8|1.3|
کاکائو داغ با شیر برنج|Hot cocoa with rice milk|66|0.3|14.4|0.8|
کاکائو داغ با شیر فندق|Hot cocoa with hazelnut milk|49|0.5|9.1|1.1|
کاکائو داغ با شیر کاجو|Hot cocoa with cashew milk|46|0.7|7.8|1.3|
کاکائو داغ با شیر بدون لاکتوز|Hot cocoa with lactose-free milk|80|3|10.7|2.8|
کاکائو داغ با شیر بز|Hot cocoa with goat milk|87|3.2|10.5|3.6|
کاکائو داغ با شیر شتر|Hot cocoa with camel milk|80|2.7|10.4|3.1|
کاکائو داغ با شیر گردو|Hot cocoa with walnut milk|45|0.8|7.2|1.4|
کاکائو داغ با شیر پسته|Hot cocoa with pistachio milk|55|1.1|9.1|1.6|
شیر کاکائو با شیر کامل|Chocolate milk with whole milk|80|3.2|9.8|3.1|
شیر کاکائو با شیر کم‌چرب|Chocolate milk with skim milk|53|3.2|9.8|0.1|
شیر کاکائو با شیر نیم‌چرب|Chocolate milk with 2% milk|69|3.2|9.8|1.9|
شیر کاکائو با شیر بادام|Chocolate milk with almond milk|35|0.5|5.8|1.1|
شیر کاکائو با شیر سویا|Chocolate milk with soy milk|56|2.8|7.4|1.7|
شیر کاکائو با شیر جو دوسر|Chocolate milk with oat milk|60|0.9|11.2|1.3|
شیر کاکائو با شیر نارگیل|Chocolate milk with coconut milk drink|39|0.2|6.4|1.4|
شیر کاکائو با شیر برنج|Chocolate milk with rice milk|63|0.3|13.5|0.9|
شیر کاکائو با شیر فندق|Chocolate milk with hazelnut milk|45|0.6|7.8|1.2|
شیر کاکائو با شیر کاجو|Chocolate milk with cashew milk|42|0.8|6.4|1.4|
شیر کاکائو با شیر بدون لاکتوز|Chocolate milk with lactose-free milk|79|3.2|9.6|3|
شیر کاکائو با شیر بز|Chocolate milk with goat milk|86|3.4|9.3|3.9|
شیر کاکائو با شیر شتر|Chocolate milk with camel milk|78|2.9|9.2|3.3|
شیر کاکائو با شیر گردو|Chocolate milk with walnut milk|40|0.9|5.8|1.5|
شیر کاکائو با شیر پسته|Chocolate milk with pistachio milk|51|1.1|7.8|1.7|
شیر قهوه با شیر کامل|Coffee milk with whole milk|73|3.1|8.5|3|
شیر قهوه با شیر کم‌چرب|Coffee milk with skim milk|47|3.1|8.5|0.1|
شیر قهوه با شیر نیم‌چرب|Coffee milk with 2% milk|62|3.1|8.5|1.8|
شیر قهوه با شیر بادام|Coffee milk with almond milk|30|0.5|4.7|1.1|
شیر قهوه با شیر سویا|Coffee milk with soy milk|50|2.6|6.2|1.6|
شیر قهوه با شیر جو دوسر|Coffee milk with oat milk|54|0.9|9.9|1.3|
شیر قهوه با شیر نارگیل|Coffee milk with coconut milk drink|34|0.2|5.3|1.4|
شیر قهوه با شیر برنج|Coffee milk with rice milk|57|0.3|12.1|0.8|
شیر قهوه با شیر فندق|Coffee milk with hazelnut milk|39|0.5|6.7|1.2|
شیر قهوه با شیر کاجو|Coffee milk with cashew milk|36|0.7|5.3|1.4|
شیر قهوه با شیر بدون لاکتوز|Coffee milk with lactose-free milk|71|3.1|8.3|2.9|
شیر قهوه با شیر بز|Coffee milk with goat milk|78|3.2|8.1|3.7|
شیر قهوه با شیر شتر|Coffee milk with camel milk|71|2.8|8|3.1|
شیر قهوه با شیر گردو|Coffee milk with walnut milk|35|0.8|4.7|1.4|
شیر قهوه با شیر پسته|Coffee milk with pistachio milk|46|1.1|6.7|1.6|
شیر عسل با شیر کامل|Honey milk with whole milk|79|3.3|9.3|3.2|
شیر عسل با شیر کم‌چرب|Honey milk with skim milk|51|3.3|9.3|0.1|
شیر عسل با شیر نیم‌چرب|Honey milk with 2% milk|68|3.3|9.3|1.9|
شیر عسل با شیر بادام|Honey milk with almond milk|34|0.5|5.3|1.2|
شیر عسل با شیر سویا|Honey milk with soy milk|55|2.8|6.9|1.7|
شیر عسل با شیر جو دوسر|Honey milk with oat milk|59|1|10.8|1.4|
شیر عسل با شیر نارگیل|Honey milk with coconut milk drink|38|0.2|6|1.5|
شیر عسل با شیر برنج|Honey milk with rice milk|62|0.3|13.2|0.9|
شیر عسل با شیر فندق|Honey milk with hazelnut milk|43|0.6|7.4|1.3|
شیر عسل با شیر کاجو|Honey milk with cashew milk|40|0.8|6|1.5|
شیر عسل با شیر بدون لاکتوز|Honey milk with lactose-free milk|78|3.3|9.2|3.1|
شیر عسل با شیر بز|Honey milk with goat milk|85|3.5|8.9|4|
شیر عسل با شیر شتر|Honey milk with camel milk|78|3|8.8|3.4|
شیر عسل با شیر گردو|Honey milk with walnut milk|39|0.9|5.3|1.6|
شیر عسل با شیر پسته|Honey milk with pistachio milk|50|1.2|7.4|1.7|
شیر زردچوبه با شیر کامل|Golden milk with whole milk|68|3.2|6.8|3.1|
شیر زردچوبه با شیر کم‌چرب|Golden milk with skim milk|41|3.2|6.8|0.1|
شیر زردچوبه با شیر نیم‌چرب|Golden milk with 2% milk|57|3.2|6.8|1.9|
شیر زردچوبه با شیر بادام|Golden milk with almond milk|23|0.5|2.8|1.1|
شیر زردچوبه با شیر سویا|Golden milk with soy milk|44|2.8|4.4|1.7|
شیر زردچوبه با شیر جو دوسر|Golden milk with oat milk|48|0.9|8.2|1.3|
شیر زردچوبه با شیر نارگیل|Golden milk with coconut milk drink|27|0.2|3.4|1.4|
شیر زردچوبه با شیر برنج|Golden milk with rice milk|51|0.3|10.5|0.9|
شیر زردچوبه با شیر فندق|Golden milk with hazelnut milk|33|0.6|4.8|1.2|
شیر زردچوبه با شیر کاجو|Golden milk with cashew milk|30|0.8|3.4|1.4|
شیر زردچوبه با شیر بدون لاکتوز|Golden milk with lactose-free milk|67|3.2|6.6|3|
شیر زردچوبه با شیر بز|Golden milk with goat milk|74|3.4|6.3|3.9|
شیر زردچوبه با شیر شتر|Golden milk with camel milk|66|2.9|6.2|3.3|
شیر زردچوبه با شیر گردو|Golden milk with walnut milk|28|0.9|2.8|1.5|
شیر زردچوبه با شیر پسته|Golden milk with pistachio milk|39|1.1|4.8|1.7|
شیر زعفران با شیر کامل|Saffron milk with whole milk|71|3.3|7.3|3.2|
شیر زعفران با شیر کم‌چرب|Saffron milk with skim milk|43|3.3|7.3|0.1|
شیر زعفران با شیر نیم‌چرب|Saffron milk with 2% milk|60|3.3|7.3|1.9|
شیر زعفران با شیر بادام|Saffron milk with almond milk|26|0.5|3.3|1.2|
شیر زعفران با شیر سویا|Saffron milk with soy milk|47|2.8|4.9|1.7|
شیر زعفران با شیر جو دوسر|Saffron milk with oat milk|51|1|8.8|1.4|
شیر زعفران با شیر نارگیل|Saffron milk with coconut milk drink|30|0.2|4|1.5|
شیر زعفران با شیر برنج|Saffron milk with rice milk|54|0.3|11.2|0.9|
شیر زعفران با شیر فندق|Saffron milk with hazelnut milk|35|0.6|5.4|1.3|
شیر زعفران با شیر کاجو|Saffron milk with cashew milk|32|0.8|4|1.5|
شیر زعفران با شیر بدون لاکتوز|Saffron milk with lactose-free milk|70|3.3|7.2|3.1|
شیر زعفران با شیر بز|Saffron milk with goat milk|77|3.5|6.9|4|
شیر زعفران با شیر شتر|Saffron milk with camel milk|70|3|6.8|3.4|
شیر زعفران با شیر گردو|Saffron milk with walnut milk|31|0.9|3.3|1.6|
شیر زعفران با شیر پسته|Saffron milk with pistachio milk|42|1.2|5.4|1.7|
شیر دارچین با شیر کامل|Cinnamon milk with whole milk|67|3.3|6.3|3.2|
شیر دارچین با شیر کم‌چرب|Cinnamon milk with skim milk|39|3.3|6.3|0.1|
شیر دارچین با شیر نیم‌چرب|Cinnamon milk with 2% milk|56|3.3|6.3|1.9|
شیر دارچین با شیر بادام|Cinnamon milk with almond milk|22|0.5|2.3|1.2|
شیر دارچین با شیر سویا|Cinnamon milk with soy milk|43|2.8|3.9|1.7|
شیر دارچین با شیر جو دوسر|Cinnamon milk with oat milk|47|1|7.8|1.4|
شیر دارچین با شیر نارگیل|Cinnamon milk with coconut milk drink|26|0.2|3|1.5|
شیر دارچین با شیر برنج|Cinnamon milk with rice milk|50|0.3|10.2|0.9|
شیر دارچین با شیر فندق|Cinnamon milk with hazelnut milk|31|0.6|4.4|1.3|
شیر دارچین با شیر کاجو|Cinnamon milk with cashew milk|28|0.8|3|1.5|
شیر دارچین با شیر بدون لاکتوز|Cinnamon milk with lactose-free milk|66|3.3|6.2|3.1|
شیر دارچین با شیر بز|Cinnamon milk with goat milk|73|3.5|5.9|4|
شیر دارچین با شیر شتر|Cinnamon milk with camel milk|66|3|5.8|3.4|
شیر دارچین با شیر گردو|Cinnamon milk with walnut milk|27|0.9|2.3|1.6|
شیر دارچین با شیر پسته|Cinnamon milk with pistachio milk|38|1.2|4.4|1.7|
شیر موز با شیر کامل|Banana milk with whole milk|75|2.7|10|2.6|
شیر موز با شیر کم‌چرب|Banana milk with skim milk|52|2.7|10|0.1|
شیر موز با شیر نیم‌چرب|Banana milk with 2% milk|65|2.7|10|1.6|
شیر موز با شیر بادام|Banana milk with almond milk|37|0.4|6.6|1|
شیر موز با شیر سویا|Banana milk with soy milk|54|2.3|8|1.4|
شیر موز با شیر جو دوسر|Banana milk with oat milk|58|0.8|11.2|1.1|
شیر موز با شیر نارگیل|Banana milk with coconut milk drink|40|0.2|7.2|1.2|
شیر موز با شیر برنج|Banana milk with rice milk|60|0.2|13.2|0.7|
شیر موز با شیر فندق|Banana milk with hazelnut milk|45|0.5|8.4|1|
شیر موز با شیر کاجو|Banana milk with cashew milk|42|0.6|7.2|1.2|
شیر موز با شیر بدون لاکتوز|Banana milk with lactose-free milk|73|2.7|9.8|2.6|
شیر موز با شیر بز|Banana milk with goat milk|79|2.9|9.6|3.3|
شیر موز با شیر شتر|Banana milk with camel milk|73|2.5|9.5|2.8|
شیر موز با شیر گردو|Banana milk with walnut milk|41|0.7|6.6|1.3|
شیر موز با شیر پسته|Banana milk with pistachio milk|50|1|8.4|1.4|
شیر نسکافه با شیر کامل|Nescafe milk with whole milk|73|3.1|8.5|3|
شیر نسکافه با شیر کم‌چرب|Nescafe milk with skim milk|47|3.1|8.5|0.1|
شیر نسکافه با شیر نیم‌چرب|Nescafe milk with 2% milk|62|3.1|8.5|1.8|
شیر نسکافه با شیر بادام|Nescafe milk with almond milk|30|0.5|4.7|1.1|
شیر نسکافه با شیر سویا|Nescafe milk with soy milk|50|2.6|6.2|1.6|
شیر نسکافه با شیر جو دوسر|Nescafe milk with oat milk|54|0.9|9.9|1.3|
شیر نسکافه با شیر نارگیل|Nescafe milk with coconut milk drink|34|0.2|5.3|1.4|
شیر نسکافه با شیر برنج|Nescafe milk with rice milk|57|0.3|12.1|0.8|
شیر نسکافه با شیر فندق|Nescafe milk with hazelnut milk|39|0.5|6.7|1.2|
شیر نسکافه با شیر کاجو|Nescafe milk with cashew milk|36|0.7|5.3|1.4|
شیر نسکافه با شیر بدون لاکتوز|Nescafe milk with lactose-free milk|71|3.1|8.3|2.9|
شیر نسکافه با شیر بز|Nescafe milk with goat milk|78|3.2|8.1|3.7|
شیر نسکافه با شیر شتر|Nescafe milk with camel milk|71|2.8|8|3.1|
شیر نسکافه با شیر گردو|Nescafe milk with walnut milk|35|0.8|4.7|1.4|
شیر نسکافه با شیر پسته|Nescafe milk with pistachio milk|46|1.1|6.7|1.6|
لاته وانیل|Vanilla latte|84|3.2|10.5|3.2|
لاته وانیل با شیر بادام|Vanilla latte with almond milk|42|0.6|7|1.3|
لاته وانیل با شیر جو دوسر|Vanilla latte with oat milk|60|1|10.5|1.6|
لاته وانیل بدون شکر|Sugar-free vanilla latte|62|3.2|5|3.2|
کاپوچینو وانیل|Vanilla cappuccino|75|3|9.5|2.8|
کاپوچینو وانیل با شیر بادام|Vanilla cappuccino with almond milk|39|0.6|6.6|1.1|
کاپوچینو وانیل با شیر جو دوسر|Vanilla cappuccino with oat milk|54|0.9|9.4|1.4|
کاپوچینو وانیل بدون شکر|Sugar-free vanilla cappuccino|53|3|4|2.8|
موکا وانیل|Vanilla mocha|101|3|15.5|3|
موکا وانیل با شیر بادام|Vanilla mocha with almond milk|49|0.6|9|1.2|
موکا وانیل با شیر جو دوسر|Vanilla mocha with oat milk|81|0.9|16|1.5|
موکا وانیل بدون شکر|Sugar-free vanilla mocha|79|3|10|3|
لاته یخ وانیل|Vanilla iced latte|69|2.4|9.5|2.4|
لاته یخ وانیل با شیر بادام|Vanilla iced latte with almond milk|37|0.5|6.6|1|
لاته یخ وانیل با شیر جو دوسر|Vanilla iced latte with oat milk|51|0.7|9.4|1.2|
لاته یخ وانیل بدون شکر|Sugar-free vanilla iced latte|47|2.4|4|2.4|
قهوه فرانسه وانیل|Vanilla French coffee|79|3|10|3|
قهوه فرانسه وانیل با شیر بادام|Vanilla French coffee with almond milk|40|0.6|6.8|1.2|
قهوه فرانسه وانیل با شیر جو دوسر|Vanilla French coffee with oat milk|57|0.9|9.9|1.5|
قهوه فرانسه وانیل بدون شکر|Sugar-free vanilla French coffee|57|3|4.5|3|
فلت وایت وانیل|Vanilla flat white|87|3.6|10.3|3.5|
فلت وایت وانیل با شیر بادام|Vanilla flat white with almond milk|43|0.7|6.9|1.4|
فلت وایت وانیل با شیر جو دوسر|Vanilla flat white with oat milk|61|1.1|10.3|1.8|
فلت وایت وانیل بدون شکر|Sugar-free vanilla flat white|65|3.6|4.8|3.5|
لاته کارامل|Caramel latte|86|3.2|11.1|3.2|
لاته کارامل با شیر بادام|Caramel latte with almond milk|44|0.6|7.5|1.3|
لاته کارامل با شیر جو دوسر|Caramel latte with oat milk|62|1|11|1.6|
لاته کارامل بدون شکر|Sugar-free caramel latte|62|3.2|5|3.2|
کاپوچینو کارامل|Caramel cappuccino|77|3|10.1|2.8|
کاپوچینو کارامل با شیر بادام|Caramel cappuccino with almond milk|41|0.6|7.1|1.1|
کاپوچینو کارامل با شیر جو دوسر|Caramel cappuccino with oat milk|56|0.9|9.9|1.4|
کاپوچینو کارامل بدون شکر|Sugar-free caramel cappuccino|53|3|4|2.8|
موکا کارامل|Caramel mocha|103|3|16.1|3|
موکا کارامل با شیر بادام|Caramel mocha with almond milk|51|0.6|9.5|1.2|
موکا کارامل با شیر جو دوسر|Caramel mocha with oat milk|83|0.9|16.5|1.5|
موکا کارامل بدون شکر|Sugar-free caramel mocha|79|3|10|3|
لاته یخ کارامل|Caramel iced latte|71|2.4|10.1|2.4|
لاته یخ کارامل با شیر بادام|Caramel iced latte with almond milk|39|0.5|7.1|1|
لاته یخ کارامل با شیر جو دوسر|Caramel iced latte with oat milk|53|0.7|9.9|1.2|
لاته یخ کارامل بدون شکر|Sugar-free caramel iced latte|47|2.4|4|2.4|
قهوه فرانسه کارامل|Caramel French coffee|81|3|10.6|3|
قهوه فرانسه کارامل با شیر بادام|Caramel French coffee with almond milk|42|0.6|7.3|1.2|
قهوه فرانسه کارامل با شیر جو دوسر|Caramel French coffee with oat milk|59|0.9|10.4|1.5|
قهوه فرانسه کارامل بدون شکر|Sugar-free caramel French coffee|57|3|4.5|3|
فلت وایت کارامل|Caramel flat white|89|3.6|10.9|3.5|
فلت وایت کارامل با شیر بادام|Caramel flat white with almond milk|45|0.7|7.4|1.4|
فلت وایت کارامل با شیر جو دوسر|Caramel flat white with oat milk|63|1.1|10.8|1.8|
فلت وایت کارامل بدون شکر|Sugar-free caramel flat white|65|3.6|4.8|3.5|
لاته فندق|Hazelnut latte|84|3.2|10.5|3.2|
لاته فندق با شیر بادام|Hazelnut latte with almond milk|42|0.6|7|1.3|
لاته فندق با شیر جو دوسر|Hazelnut latte with oat milk|60|1|10.5|1.6|
لاته فندق بدون شکر|Sugar-free hazelnut latte|62|3.2|5|3.2|
کاپوچینو فندق|Hazelnut cappuccino|75|3|9.5|2.8|
کاپوچینو فندق با شیر بادام|Hazelnut cappuccino with almond milk|39|0.6|6.6|1.1|
کاپوچینو فندق با شیر جو دوسر|Hazelnut cappuccino with oat milk|54|0.9|9.4|1.4|
کاپوچینو فندق بدون شکر|Sugar-free hazelnut cappuccino|53|3|4|2.8|
موکا فندق|Hazelnut mocha|101|3|15.5|3|
موکا فندق با شیر بادام|Hazelnut mocha with almond milk|49|0.6|9|1.2|
موکا فندق با شیر جو دوسر|Hazelnut mocha with oat milk|81|0.9|16|1.5|
موکا فندق بدون شکر|Sugar-free hazelnut mocha|79|3|10|3|
لاته یخ فندق|Hazelnut iced latte|69|2.4|9.5|2.4|
لاته یخ فندق با شیر بادام|Hazelnut iced latte with almond milk|37|0.5|6.6|1|
لاته یخ فندق با شیر جو دوسر|Hazelnut iced latte with oat milk|51|0.7|9.4|1.2|
لاته یخ فندق بدون شکر|Sugar-free hazelnut iced latte|47|2.4|4|2.4|
قهوه فرانسه فندق|Hazelnut French coffee|79|3|10|3|
قهوه فرانسه فندق با شیر بادام|Hazelnut French coffee with almond milk|40|0.6|6.8|1.2|
قهوه فرانسه فندق با شیر جو دوسر|Hazelnut French coffee with oat milk|57|0.9|9.9|1.5|
قهوه فرانسه فندق بدون شکر|Sugar-free hazelnut French coffee|57|3|4.5|3|
فلت وایت فندق|Hazelnut flat white|87|3.6|10.3|3.5|
فلت وایت فندق با شیر بادام|Hazelnut flat white with almond milk|43|0.7|6.9|1.4|
فلت وایت فندق با شیر جو دوسر|Hazelnut flat white with oat milk|61|1.1|10.3|1.8|
فلت وایت فندق بدون شکر|Sugar-free hazelnut flat white|65|3.6|4.8|3.5|
لاته شکلات|Chocolate latte|81|3.2|9.9|3.2|
لاته شکلات با شیر بادام|Chocolate latte with almond milk|40|0.6|6.5|1.3|
لاته شکلات با شیر جو دوسر|Chocolate latte with oat milk|58|1|10|1.6|
لاته شکلات بدون شکر|Sugar-free chocolate latte|62|3.2|5|3.2|
کاپوچینو شکلات|Chocolate cappuccino|73|3|8.9|2.8|
کاپوچینو شکلات با شیر بادام|Chocolate cappuccino with almond milk|37|0.6|6.1|1.1|
کاپوچینو شکلات با شیر جو دوسر|Chocolate cappuccino with oat milk|52|0.9|8.9|1.4|
کاپوچینو شکلات بدون شکر|Sugar-free chocolate cappuccino|53|3|4|2.8|
موکا شکلات|Chocolate mocha|99|3|14.9|3|
موکا شکلات با شیر بادام|Chocolate mocha with almond milk|47|0.6|8.5|1.2|
موکا شکلات با شیر جو دوسر|Chocolate mocha with oat milk|79|0.9|15.5|1.5|
موکا شکلات بدون شکر|Sugar-free chocolate mocha|79|3|10|3|
لاته یخ شکلات|Chocolate iced latte|67|2.4|8.9|2.4|
لاته یخ شکلات با شیر بادام|Chocolate iced latte with almond milk|35|0.5|6.1|1|
لاته یخ شکلات با شیر جو دوسر|Chocolate iced latte with oat milk|49|0.7|8.9|1.2|
لاته یخ شکلات بدون شکر|Sugar-free chocolate iced latte|47|2.4|4|2.4|
قهوه فرانسه شکلات|Chocolate French coffee|77|3|9.4|3|
قهوه فرانسه شکلات با شیر بادام|Chocolate French coffee with almond milk|38|0.6|6.3|1.2|
قهوه فرانسه شکلات با شیر جو دوسر|Chocolate French coffee with oat milk|55|0.9|9.4|1.5|
قهوه فرانسه شکلات بدون شکر|Sugar-free chocolate French coffee|57|3|4.5|3|
فلت وایت شکلات|Chocolate flat white|85|3.6|9.8|3.5|
فلت وایت شکلات با شیر بادام|Chocolate flat white with almond milk|41|0.7|6.4|1.4|
فلت وایت شکلات با شیر جو دوسر|Chocolate flat white with oat milk|59|1.1|9.8|1.8|
فلت وایت شکلات بدون شکر|Sugar-free chocolate flat white|65|3.6|4.8|3.5|
لاته دارچین|Cinnamon latte|81|3.2|9.9|3.2|
لاته دارچین با شیر بادام|Cinnamon latte with almond milk|40|0.6|6.5|1.3|
لاته دارچین با شیر جو دوسر|Cinnamon latte with oat milk|58|1|10|1.6|
لاته دارچین بدون شکر|Sugar-free cinnamon latte|62|3.2|5|3.2|
کاپوچینو دارچین|Cinnamon cappuccino|73|3|8.9|2.8|
کاپوچینو دارچین با شیر بادام|Cinnamon cappuccino with almond milk|37|0.6|6.1|1.1|
کاپوچینو دارچین با شیر جو دوسر|Cinnamon cappuccino with oat milk|52|0.9|8.9|1.4|
کاپوچینو دارچین بدون شکر|Sugar-free cinnamon cappuccino|53|3|4|2.8|
موکا دارچین|Cinnamon mocha|99|3|14.9|3|
موکا دارچین با شیر بادام|Cinnamon mocha with almond milk|47|0.6|8.5|1.2|
موکا دارچین با شیر جو دوسر|Cinnamon mocha with oat milk|79|0.9|15.5|1.5|
موکا دارچین بدون شکر|Sugar-free cinnamon mocha|79|3|10|3|
لاته یخ دارچین|Cinnamon iced latte|67|2.4|8.9|2.4|
لاته یخ دارچین با شیر بادام|Cinnamon iced latte with almond milk|35|0.5|6.1|1|
لاته یخ دارچین با شیر جو دوسر|Cinnamon iced latte with oat milk|49|0.7|8.9|1.2|
لاته یخ دارچین بدون شکر|Sugar-free cinnamon iced latte|47|2.4|4|2.4|
قهوه فرانسه دارچین|Cinnamon French coffee|77|3|9.4|3|
قهوه فرانسه دارچین با شیر بادام|Cinnamon French coffee with almond milk|38|0.6|6.3|1.2|
قهوه فرانسه دارچین با شیر جو دوسر|Cinnamon French coffee with oat milk|55|0.9|9.4|1.5|
قهوه فرانسه دارچین بدون شکر|Sugar-free cinnamon French coffee|57|3|4.5|3|
فلت وایت دارچین|Cinnamon flat white|85|3.6|9.8|3.5|
فلت وایت دارچین با شیر بادام|Cinnamon flat white with almond milk|41|0.7|6.4|1.4|
فلت وایت دارچین با شیر جو دوسر|Cinnamon flat white with oat milk|59|1.1|9.8|1.8|
فلت وایت دارچین بدون شکر|Sugar-free cinnamon flat white|65|3.6|4.8|3.5|
لاته نارگیل|Coconut latte|81|3.2|9.9|3.2|
لاته نارگیل با شیر بادام|Coconut latte with almond milk|40|0.6|6.5|1.3|
لاته نارگیل با شیر جو دوسر|Coconut latte with oat milk|58|1|10|1.6|
لاته نارگیل بدون شکر|Sugar-free coconut latte|62|3.2|5|3.2|
کاپوچینو نارگیل|Coconut cappuccino|73|3|8.9|2.8|
کاپوچینو نارگیل با شیر بادام|Coconut cappuccino with almond milk|37|0.6|6.1|1.1|
کاپوچینو نارگیل با شیر جو دوسر|Coconut cappuccino with oat milk|52|0.9|8.9|1.4|
کاپوچینو نارگیل بدون شکر|Sugar-free coconut cappuccino|53|3|4|2.8|
موکا نارگیل|Coconut mocha|99|3|14.9|3|
موکا نارگیل با شیر بادام|Coconut mocha with almond milk|47|0.6|8.5|1.2|
موکا نارگیل با شیر جو دوسر|Coconut mocha with oat milk|79|0.9|15.5|1.5|
موکا نارگیل بدون شکر|Sugar-free coconut mocha|79|3|10|3|
لاته یخ نارگیل|Coconut iced latte|67|2.4|8.9|2.4|
لاته یخ نارگیل با شیر بادام|Coconut iced latte with almond milk|35|0.5|6.1|1|
لاته یخ نارگیل با شیر جو دوسر|Coconut iced latte with oat milk|49|0.7|8.9|1.2|
لاته یخ نارگیل بدون شکر|Sugar-free coconut iced latte|47|2.4|4|2.4|
قهوه فرانسه نارگیل|Coconut French coffee|77|3|9.4|3|
قهوه فرانسه نارگیل با شیر بادام|Coconut French coffee with almond milk|38|0.6|6.3|1.2|
قهوه فرانسه نارگیل با شیر جو دوسر|Coconut French coffee with oat milk|55|0.9|9.4|1.5|
قهوه فرانسه نارگیل بدون شکر|Sugar-free coconut French coffee|57|3|4.5|3|
فلت وایت نارگیل|Coconut flat white|85|3.6|9.8|3.5|
فلت وایت نارگیل با شیر بادام|Coconut flat white with almond milk|41|0.7|6.4|1.4|
فلت وایت نارگیل با شیر جو دوسر|Coconut flat white with oat milk|59|1.1|9.8|1.8|
فلت وایت نارگیل بدون شکر|Sugar-free coconut flat white|65|3.6|4.8|3.5|
لاته بادام|Almond latte|81|3.2|9.9|3.2|
لاته بادام با شیر بادام|Almond latte with almond milk|40|0.6|6.5|1.3|
لاته بادام با شیر جو دوسر|Almond latte with oat milk|58|1|10|1.6|
لاته بادام بدون شکر|Sugar-free almond latte|62|3.2|5|3.2|
کاپوچینو بادام|Almond cappuccino|73|3|8.9|2.8|
کاپوچینو بادام با شیر بادام|Almond cappuccino with almond milk|37|0.6|6.1|1.1|
کاپوچینو بادام با شیر جو دوسر|Almond cappuccino with oat milk|52|0.9|8.9|1.4|
کاپوچینو بادام بدون شکر|Sugar-free almond cappuccino|53|3|4|2.8|
موکا بادام|Almond mocha|99|3|14.9|3|
موکا بادام با شیر بادام|Almond mocha with almond milk|47|0.6|8.5|1.2|
موکا بادام با شیر جو دوسر|Almond mocha with oat milk|79|0.9|15.5|1.5|
موکا بادام بدون شکر|Sugar-free almond mocha|79|3|10|3|
لاته یخ بادام|Almond iced latte|67|2.4|8.9|2.4|
لاته یخ بادام با شیر بادام|Almond iced latte with almond milk|35|0.5|6.1|1|
لاته یخ بادام با شیر جو دوسر|Almond iced latte with oat milk|49|0.7|8.9|1.2|
لاته یخ بادام بدون شکر|Sugar-free almond iced latte|47|2.4|4|2.4|
قهوه فرانسه بادام|Almond French coffee|77|3|9.4|3|
قهوه فرانسه بادام با شیر بادام|Almond French coffee with almond milk|38|0.6|6.3|1.2|
قهوه فرانسه بادام با شیر جو دوسر|Almond French coffee with oat milk|55|0.9|9.4|1.5|
قهوه فرانسه بادام بدون شکر|Sugar-free almond French coffee|57|3|4.5|3|
فلت وایت بادام|Almond flat white|85|3.6|9.8|3.5|
فلت وایت بادام با شیر بادام|Almond flat white with almond milk|41|0.7|6.4|1.4|
فلت وایت بادام با شیر جو دوسر|Almond flat white with oat milk|59|1.1|9.8|1.8|
فلت وایت بادام بدون شکر|Sugar-free almond flat white|65|3.6|4.8|3.5|
لاته پسته|Pistachio latte|84|3.2|10.5|3.2|
لاته پسته با شیر بادام|Pistachio latte with almond milk|42|0.6|7|1.3|
لاته پسته با شیر جو دوسر|Pistachio latte with oat milk|60|1|10.5|1.6|
لاته پسته بدون شکر|Sugar-free pistachio latte|62|3.2|5|3.2|
کاپوچینو پسته|Pistachio cappuccino|75|3|9.5|2.8|
کاپوچینو پسته با شیر بادام|Pistachio cappuccino with almond milk|39|0.6|6.6|1.1|
کاپوچینو پسته با شیر جو دوسر|Pistachio cappuccino with oat milk|54|0.9|9.4|1.4|
کاپوچینو پسته بدون شکر|Sugar-free pistachio cappuccino|53|3|4|2.8|
موکا پسته|Pistachio mocha|101|3|15.5|3|
موکا پسته با شیر بادام|Pistachio mocha with almond milk|49|0.6|9|1.2|
موکا پسته با شیر جو دوسر|Pistachio mocha with oat milk|81|0.9|16|1.5|
موکا پسته بدون شکر|Sugar-free pistachio mocha|79|3|10|3|
لاته یخ پسته|Pistachio iced latte|69|2.4|9.5|2.4|
لاته یخ پسته با شیر بادام|Pistachio iced latte with almond milk|37|0.5|6.6|1|
لاته یخ پسته با شیر جو دوسر|Pistachio iced latte with oat milk|51|0.7|9.4|1.2|
لاته یخ پسته بدون شکر|Sugar-free pistachio iced latte|47|2.4|4|2.4|
قهوه فرانسه پسته|Pistachio French coffee|79|3|10|3|
قهوه فرانسه پسته با شیر بادام|Pistachio French coffee with almond milk|40|0.6|6.8|1.2|
قهوه فرانسه پسته با شیر جو دوسر|Pistachio French coffee with oat milk|57|0.9|9.9|1.5|
قهوه فرانسه پسته بدون شکر|Sugar-free pistachio French coffee|57|3|4.5|3|
فلت وایت پسته|Pistachio flat white|87|3.6|10.3|3.5|
فلت وایت پسته با شیر بادام|Pistachio flat white with almond milk|43|0.7|6.9|1.4|
فلت وایت پسته با شیر جو دوسر|Pistachio flat white with oat milk|61|1.1|10.3|1.8|
فلت وایت پسته بدون شکر|Sugar-free pistachio flat white|65|3.6|4.8|3.5|
لاته زعفران|Saffron latte|79|3.2|9.4|3.2|
لاته زعفران با شیر بادام|Saffron latte with almond milk|38|0.6|6|1.3|
لاته زعفران با شیر جو دوسر|Saffron latte with oat milk|56|1|9.5|1.6|
لاته زعفران بدون شکر|Sugar-free saffron latte|62|3.2|5|3.2|
کاپوچینو زعفران|Saffron cappuccino|71|3|8.4|2.8|
کاپوچینو زعفران با شیر بادام|Saffron cappuccino with almond milk|35|0.6|5.6|1.1|
کاپوچینو زعفران با شیر جو دوسر|Saffron cappuccino with oat milk|50|0.9|8.4|1.4|
کاپوچینو زعفران بدون شکر|Sugar-free saffron cappuccino|53|3|4|2.8|
موکا زعفران|Saffron mocha|97|3|14.4|3|
موکا زعفران با شیر بادام|Saffron mocha with almond milk|45|0.6|8|1.2|
موکا زعفران با شیر جو دوسر|Saffron mocha with oat milk|77|0.9|15|1.5|
موکا زعفران بدون شکر|Sugar-free saffron mocha|79|3|10|3|
لاته یخ زعفران|Saffron iced latte|65|2.4|8.4|2.4|
لاته یخ زعفران با شیر بادام|Saffron iced latte with almond milk|33|0.5|5.6|1|
لاته یخ زعفران با شیر جو دوسر|Saffron iced latte with oat milk|47|0.7|8.4|1.2|
لاته یخ زعفران بدون شکر|Sugar-free saffron iced latte|47|2.4|4|2.4|
قهوه فرانسه زعفران|Saffron French coffee|75|3|8.9|3|
قهوه فرانسه زعفران با شیر بادام|Saffron French coffee with almond milk|36|0.6|5.8|1.2|
قهوه فرانسه زعفران با شیر جو دوسر|Saffron French coffee with oat milk|53|0.9|8.9|1.5|
قهوه فرانسه زعفران بدون شکر|Sugar-free saffron French coffee|57|3|4.5|3|
فلت وایت زعفران|Saffron flat white|83|3.6|9.2|3.5|
فلت وایت زعفران با شیر بادام|Saffron flat white with almond milk|39|0.7|5.9|1.4|
فلت وایت زعفران با شیر جو دوسر|Saffron flat white with oat milk|57|1.1|9.3|1.8|
فلت وایت زعفران بدون شکر|Sugar-free saffron flat white|65|3.6|4.8|3.5|
لاته گلاب|Rose latte|79|3.2|9.4|3.2|
لاته گلاب با شیر بادام|Rose latte with almond milk|38|0.6|6|1.3|
لاته گلاب با شیر جو دوسر|Rose latte with oat milk|56|1|9.5|1.6|
لاته گلاب بدون شکر|Sugar-free rose latte|62|3.2|5|3.2|
کاپوچینو گلاب|Rose cappuccino|71|3|8.4|2.8|
کاپوچینو گلاب با شیر بادام|Rose cappuccino with almond milk|35|0.6|5.6|1.1|
کاپوچینو گلاب با شیر جو دوسر|Rose cappuccino with oat milk|50|0.9|8.4|1.4|
کاپوچینو گلاب بدون شکر|Sugar-free rose cappuccino|53|3|4|2.8|
موکا گلاب|Rose mocha|97|3|14.4|3|
موکا گلاب با شیر بادام|Rose mocha with almond milk|45|0.6|8|1.2|
موکا گلاب با شیر جو دوسر|Rose mocha with oat milk|77|0.9|15|1.5|
موکا گلاب بدون شکر|Sugar-free rose mocha|79|3|10|3|
لاته یخ گلاب|Rose iced latte|65|2.4|8.4|2.4|
لاته یخ گلاب با شیر بادام|Rose iced latte with almond milk|33|0.5|5.6|1|
لاته یخ گلاب با شیر جو دوسر|Rose iced latte with oat milk|47|0.7|8.4|1.2|
لاته یخ گلاب بدون شکر|Sugar-free rose iced latte|47|2.4|4|2.4|
قهوه فرانسه گلاب|Rose French coffee|75|3|8.9|3|
قهوه فرانسه گلاب با شیر بادام|Rose French coffee with almond milk|36|0.6|5.8|1.2|
قهوه فرانسه گلاب با شیر جو دوسر|Rose French coffee with oat milk|53|0.9|8.9|1.5|
قهوه فرانسه گلاب بدون شکر|Sugar-free rose French coffee|57|3|4.5|3|
فلت وایت گلاب|Rose flat white|83|3.6|9.2|3.5|
فلت وایت گلاب با شیر بادام|Rose flat white with almond milk|39|0.7|5.9|1.4|
فلت وایت گلاب با شیر جو دوسر|Rose flat white with oat milk|57|1.1|9.3|1.8|
فلت وایت گلاب بدون شکر|Sugar-free rose flat white|65|3.6|4.8|3.5|
لاته هل|Cardamom latte|79|3.2|9.4|3.2|
لاته هل با شیر بادام|Cardamom latte with almond milk|38|0.6|6|1.3|
لاته هل با شیر جو دوسر|Cardamom latte with oat milk|56|1|9.5|1.6|
لاته هل بدون شکر|Sugar-free cardamom latte|62|3.2|5|3.2|
کاپوچینو هل|Cardamom cappuccino|71|3|8.4|2.8|
کاپوچینو هل با شیر بادام|Cardamom cappuccino with almond milk|35|0.6|5.6|1.1|
کاپوچینو هل با شیر جو دوسر|Cardamom cappuccino with oat milk|50|0.9|8.4|1.4|
کاپوچینو هل بدون شکر|Sugar-free cardamom cappuccino|53|3|4|2.8|
موکا هل|Cardamom mocha|97|3|14.4|3|
موکا هل با شیر بادام|Cardamom mocha with almond milk|45|0.6|8|1.2|
موکا هل با شیر جو دوسر|Cardamom mocha with oat milk|77|0.9|15|1.5|
موکا هل بدون شکر|Sugar-free cardamom mocha|79|3|10|3|
لاته یخ هل|Cardamom iced latte|65|2.4|8.4|2.4|
لاته یخ هل با شیر بادام|Cardamom iced latte with almond milk|33|0.5|5.6|1|
لاته یخ هل با شیر جو دوسر|Cardamom iced latte with oat milk|47|0.7|8.4|1.2|
لاته یخ هل بدون شکر|Sugar-free cardamom iced latte|47|2.4|4|2.4|
قهوه فرانسه هل|Cardamom French coffee|75|3|8.9|3|
قهوه فرانسه هل با شیر بادام|Cardamom French coffee with almond milk|36|0.6|5.8|1.2|
قهوه فرانسه هل با شیر جو دوسر|Cardamom French coffee with oat milk|53|0.9|8.9|1.5|
قهوه فرانسه هل بدون شکر|Sugar-free cardamom French coffee|57|3|4.5|3|
فلت وایت هل|Cardamom flat white|83|3.6|9.2|3.5|
فلت وایت هل با شیر بادام|Cardamom flat white with almond milk|39|0.7|5.9|1.4|
فلت وایت هل با شیر جو دوسر|Cardamom flat white with oat milk|57|1.1|9.3|1.8|
فلت وایت هل بدون شکر|Sugar-free cardamom flat white|65|3.6|4.8|3.5|
لاته عسل|Honey latte|86|3.2|11.1|3.2|
لاته عسل با شیر بادام|Honey latte with almond milk|44|0.6|7.5|1.3|
لاته عسل با شیر جو دوسر|Honey latte with oat milk|62|1|11|1.6|
لاته عسل بدون شکر|Sugar-free honey latte|62|3.2|5|3.2|
کاپوچینو عسل|Honey cappuccino|77|3|10.1|2.8|
کاپوچینو عسل با شیر بادام|Honey cappuccino with almond milk|41|0.6|7.1|1.1|
کاپوچینو عسل با شیر جو دوسر|Honey cappuccino with oat milk|56|0.9|9.9|1.4|
کاپوچینو عسل بدون شکر|Sugar-free honey cappuccino|53|3|4|2.8|
موکا عسل|Honey mocha|103|3|16.1|3|
موکا عسل با شیر بادام|Honey mocha with almond milk|51|0.6|9.5|1.2|
موکا عسل با شیر جو دوسر|Honey mocha with oat milk|83|0.9|16.5|1.5|
موکا عسل بدون شکر|Sugar-free honey mocha|79|3|10|3|
لاته یخ عسل|Honey iced latte|71|2.4|10.1|2.4|
لاته یخ عسل با شیر بادام|Honey iced latte with almond milk|39|0.5|7.1|1|
لاته یخ عسل با شیر جو دوسر|Honey iced latte with oat milk|53|0.7|9.9|1.2|
لاته یخ عسل بدون شکر|Sugar-free honey iced latte|47|2.4|4|2.4|
قهوه فرانسه عسل|Honey French coffee|81|3|10.6|3|
قهوه فرانسه عسل با شیر بادام|Honey French coffee with almond milk|42|0.6|7.3|1.2|
قهوه فرانسه عسل با شیر جو دوسر|Honey French coffee with oat milk|59|0.9|10.4|1.5|
قهوه فرانسه عسل بدون شکر|Sugar-free honey French coffee|57|3|4.5|3|
فلت وایت عسل|Honey flat white|89|3.6|10.9|3.5|
فلت وایت عسل با شیر بادام|Honey flat white with almond milk|45|0.7|7.4|1.4|
فلت وایت عسل با شیر جو دوسر|Honey flat white with oat milk|63|1.1|10.8|1.8|
فلت وایت عسل بدون شکر|Sugar-free honey flat white|65|3.6|4.8|3.5|
لاته نعناع|Mint latte|79|3.2|9.4|3.2|
لاته نعناع با شیر بادام|Mint latte with almond milk|38|0.6|6|1.3|
لاته نعناع با شیر جو دوسر|Mint latte with oat milk|56|1|9.5|1.6|
لاته نعناع بدون شکر|Sugar-free mint latte|62|3.2|5|3.2|
کاپوچینو نعناع|Mint cappuccino|71|3|8.4|2.8|
کاپوچینو نعناع با شیر بادام|Mint cappuccino with almond milk|35|0.6|5.6|1.1|
کاپوچینو نعناع با شیر جو دوسر|Mint cappuccino with oat milk|50|0.9|8.4|1.4|
کاپوچینو نعناع بدون شکر|Sugar-free mint cappuccino|53|3|4|2.8|
موکا نعناع|Mint mocha|97|3|14.4|3|
موکا نعناع با شیر بادام|Mint mocha with almond milk|45|0.6|8|1.2|
موکا نعناع با شیر جو دوسر|Mint mocha with oat milk|77|0.9|15|1.5|
موکا نعناع بدون شکر|Sugar-free mint mocha|79|3|10|3|
لاته یخ نعناع|Mint iced latte|65|2.4|8.4|2.4|
لاته یخ نعناع با شیر بادام|Mint iced latte with almond milk|33|0.5|5.6|1|
لاته یخ نعناع با شیر جو دوسر|Mint iced latte with oat milk|47|0.7|8.4|1.2|
لاته یخ نعناع بدون شکر|Sugar-free mint iced latte|47|2.4|4|2.4|
قهوه فرانسه نعناع|Mint French coffee|75|3|8.9|3|
قهوه فرانسه نعناع با شیر بادام|Mint French coffee with almond milk|36|0.6|5.8|1.2|
قهوه فرانسه نعناع با شیر جو دوسر|Mint French coffee with oat milk|53|0.9|8.9|1.5|
قهوه فرانسه نعناع بدون شکر|Sugar-free mint French coffee|57|3|4.5|3|
فلت وایت نعناع|Mint flat white|83|3.6|9.2|3.5|
فلت وایت نعناع با شیر بادام|Mint flat white with almond milk|39|0.7|5.9|1.4|
فلت وایت نعناع با شیر جو دوسر|Mint flat white with oat milk|57|1.1|9.3|1.8|
فلت وایت نعناع بدون شکر|Sugar-free mint flat white|65|3.6|4.8|3.5|
لاته کارامل نمکی|Salted caramel latte|86|3.2|11.1|3.2|
لاته کارامل نمکی با شیر بادام|Salted caramel latte with almond milk|44|0.6|7.5|1.3|
لاته کارامل نمکی با شیر جو دوسر|Salted caramel latte with oat milk|62|1|11|1.6|
لاته کارامل نمکی بدون شکر|Sugar-free salted caramel latte|62|3.2|5|3.2|
کاپوچینو کارامل نمکی|Salted caramel cappuccino|77|3|10.1|2.8|
کاپوچینو کارامل نمکی با شیر بادام|Salted caramel cappuccino with almond milk|41|0.6|7.1|1.1|
کاپوچینو کارامل نمکی با شیر جو دوسر|Salted caramel cappuccino with oat milk|56|0.9|9.9|1.4|
کاپوچینو کارامل نمکی بدون شکر|Sugar-free salted caramel cappuccino|53|3|4|2.8|
موکا کارامل نمکی|Salted caramel mocha|103|3|16.1|3|
موکا کارامل نمکی با شیر بادام|Salted caramel mocha with almond milk|51|0.6|9.5|1.2|
موکا کارامل نمکی با شیر جو دوسر|Salted caramel mocha with oat milk|83|0.9|16.5|1.5|
موکا کارامل نمکی بدون شکر|Sugar-free salted caramel mocha|79|3|10|3|
لاته یخ کارامل نمکی|Salted caramel iced latte|71|2.4|10.1|2.4|
لاته یخ کارامل نمکی با شیر بادام|Salted caramel iced latte with almond milk|39|0.5|7.1|1|
لاته یخ کارامل نمکی با شیر جو دوسر|Salted caramel iced latte with oat milk|53|0.7|9.9|1.2|
لاته یخ کارامل نمکی بدون شکر|Sugar-free salted caramel iced latte|47|2.4|4|2.4|
قهوه فرانسه کارامل نمکی|Salted caramel French coffee|81|3|10.6|3|
قهوه فرانسه کارامل نمکی با شیر بادام|Salted caramel French coffee with almond milk|42|0.6|7.3|1.2|
قهوه فرانسه کارامل نمکی با شیر جو دوسر|Salted caramel French coffee with oat milk|59|0.9|10.4|1.5|
قهوه فرانسه کارامل نمکی بدون شکر|Sugar-free salted caramel French coffee|57|3|4.5|3|
فلت وایت کارامل نمکی|Salted caramel flat white|89|3.6|10.9|3.5|
فلت وایت کارامل نمکی با شیر بادام|Salted caramel flat white with almond milk|45|0.7|7.4|1.4|
فلت وایت کارامل نمکی با شیر جو دوسر|Salted caramel flat white with oat milk|63|1.1|10.8|1.8|
فلت وایت کارامل نمکی بدون شکر|Sugar-free salted caramel flat white|65|3.6|4.8|3.5|
لاته خرما|Date latte|84|3.2|10.5|3.2|
لاته خرما با شیر بادام|Date latte with almond milk|42|0.6|7|1.3|
لاته خرما با شیر جو دوسر|Date latte with oat milk|60|1|10.5|1.6|
لاته خرما بدون شکر|Sugar-free date latte|62|3.2|5|3.2|
کاپوچینو خرما|Date cappuccino|75|3|9.5|2.8|
کاپوچینو خرما با شیر بادام|Date cappuccino with almond milk|39|0.6|6.6|1.1|
کاپوچینو خرما با شیر جو دوسر|Date cappuccino with oat milk|54|0.9|9.4|1.4|
کاپوچینو خرما بدون شکر|Sugar-free date cappuccino|53|3|4|2.8|
موکا خرما|Date mocha|101|3|15.5|3|
موکا خرما با شیر بادام|Date mocha with almond milk|49|0.6|9|1.2|
موکا خرما با شیر جو دوسر|Date mocha with oat milk|81|0.9|16|1.5|
موکا خرما بدون شکر|Sugar-free date mocha|79|3|10|3|
لاته یخ خرما|Date iced latte|69|2.4|9.5|2.4|
لاته یخ خرما با شیر بادام|Date iced latte with almond milk|37|0.5|6.6|1|
لاته یخ خرما با شیر جو دوسر|Date iced latte with oat milk|51|0.7|9.4|1.2|
لاته یخ خرما بدون شکر|Sugar-free date iced latte|47|2.4|4|2.4|
قهوه فرانسه خرما|Date French coffee|79|3|10|3|
قهوه فرانسه خرما با شیر بادام|Date French coffee with almond milk|40|0.6|6.8|1.2|
قهوه فرانسه خرما با شیر جو دوسر|Date French coffee with oat milk|57|0.9|9.9|1.5|
قهوه فرانسه خرما بدون شکر|Sugar-free date French coffee|57|3|4.5|3|
فلت وایت خرما|Date flat white|87|3.6|10.3|3.5|
فلت وایت خرما با شیر بادام|Date flat white with almond milk|43|0.7|6.9|1.4|
فلت وایت خرما با شیر جو دوسر|Date flat white with oat milk|61|1.1|10.3|1.8|
فلت وایت خرما بدون شکر|Sugar-free date flat white|65|3.6|4.8|3.5|
لاته بیسکویت لوتوس|Lotus biscuit latte|86|3.2|11.1|3.2|
لاته بیسکویت لوتوس با شیر بادام|Lotus biscuit latte with almond milk|44|0.6|7.5|1.3|
لاته بیسکویت لوتوس با شیر جو دوسر|Lotus biscuit latte with oat milk|62|1|11|1.6|
لاته بیسکویت لوتوس بدون شکر|Sugar-free Lotus biscuit latte|62|3.2|5|3.2|
کاپوچینو بیسکویت لوتوس|Lotus biscuit cappuccino|77|3|10.1|2.8|
کاپوچینو بیسکویت لوتوس با شیر بادام|Lotus biscuit cappuccino with almond milk|41|0.6|7.1|1.1|
کاپوچینو بیسکویت لوتوس با شیر جو دوسر|Lotus biscuit cappuccino with oat milk|56|0.9|9.9|1.4|
کاپوچینو بیسکویت لوتوس بدون شکر|Sugar-free Lotus biscuit cappuccino|53|3|4|2.8|
موکا بیسکویت لوتوس|Lotus biscuit mocha|103|3|16.1|3|
موکا بیسکویت لوتوس با شیر بادام|Lotus biscuit mocha with almond milk|51|0.6|9.5|1.2|
موکا بیسکویت لوتوس با شیر جو دوسر|Lotus biscuit mocha with oat milk|83|0.9|16.5|1.5|
موکا بیسکویت لوتوس بدون شکر|Sugar-free Lotus biscuit mocha|79|3|10|3|
لاته یخ بیسکویت لوتوس|Lotus biscuit iced latte|71|2.4|10.1|2.4|
لاته یخ بیسکویت لوتوس با شیر بادام|Lotus biscuit iced latte with almond milk|39|0.5|7.1|1|
لاته یخ بیسکویت لوتوس با شیر جو دوسر|Lotus biscuit iced latte with oat milk|53|0.7|9.9|1.2|
لاته یخ بیسکویت لوتوس بدون شکر|Sugar-free Lotus biscuit iced latte|47|2.4|4|2.4|
قهوه فرانسه بیسکویت لوتوس|Lotus biscuit French coffee|81|3|10.6|3|
قهوه فرانسه بیسکویت لوتوس با شیر بادام|Lotus biscuit French coffee with almond milk|42|0.6|7.3|1.2|
قهوه فرانسه بیسکویت لوتوس با شیر جو دوسر|Lotus biscuit French coffee with oat milk|59|0.9|10.4|1.5|
قهوه فرانسه بیسکویت لوتوس بدون شکر|Sugar-free Lotus biscuit French coffee|57|3|4.5|3|
فلت وایت بیسکویت لوتوس|Lotus biscuit flat white|89|3.6|10.9|3.5|
فلت وایت بیسکویت لوتوس با شیر بادام|Lotus biscuit flat white with almond milk|45|0.7|7.4|1.4|
فلت وایت بیسکویت لوتوس با شیر جو دوسر|Lotus biscuit flat white with oat milk|63|1.1|10.8|1.8|
فلت وایت بیسکویت لوتوس بدون شکر|Sugar-free Lotus biscuit flat white|65|3.6|4.8|3.5|
لاته نوتلا|Nutella latte|88|3.2|11.6|3.2|
لاته نوتلا با شیر بادام|Nutella latte with almond milk|46|0.6|8|1.3|
لاته نوتلا با شیر جو دوسر|Nutella latte with oat milk|64|1|11.5|1.6|
لاته نوتلا بدون شکر|Sugar-free Nutella latte|62|3.2|5|3.2|
کاپوچینو نوتلا|Nutella cappuccino|80|3|10.6|2.8|
کاپوچینو نوتلا با شیر بادام|Nutella cappuccino with almond milk|43|0.6|7.6|1.1|
کاپوچینو نوتلا با شیر جو دوسر|Nutella cappuccino with oat milk|58|0.9|10.4|1.4|
کاپوچینو نوتلا بدون شکر|Sugar-free Nutella cappuccino|53|3|4|2.8|
موکا نوتلا|Nutella mocha|105|3|16.6|3|
موکا نوتلا با شیر بادام|Nutella mocha with almond milk|53|0.6|10|1.2|
موکا نوتلا با شیر جو دوسر|Nutella mocha with oat milk|85|0.9|17|1.5|
موکا نوتلا بدون شکر|Sugar-free Nutella mocha|79|3|10|3|
لاته یخ نوتلا|Nutella iced latte|74|2.4|10.6|2.4|
لاته یخ نوتلا با شیر بادام|Nutella iced latte with almond milk|41|0.5|7.6|1|
لاته یخ نوتلا با شیر جو دوسر|Nutella iced latte with oat milk|55|0.7|10.4|1.2|
لاته یخ نوتلا بدون شکر|Sugar-free Nutella iced latte|47|2.4|4|2.4|
قهوه فرانسه نوتلا|Nutella French coffee|83|3|11.1|3|
قهوه فرانسه نوتلا با شیر بادام|Nutella French coffee with almond milk|44|0.6|7.8|1.2|
قهوه فرانسه نوتلا با شیر جو دوسر|Nutella French coffee with oat milk|61|0.9|10.9|1.5|
قهوه فرانسه نوتلا بدون شکر|Sugar-free Nutella French coffee|57|3|4.5|3|
فلت وایت نوتلا|Nutella flat white|92|3.6|11.4|3.5|
فلت وایت نوتلا با شیر بادام|Nutella flat white with almond milk|47|0.7|7.9|1.4|
فلت وایت نوتلا با شیر جو دوسر|Nutella flat white with oat milk|65|1.1|11.3|1.8|
فلت وایت نوتلا بدون شکر|Sugar-free Nutella flat white|65|3.6|4.8|3.5|
لاته ماسالا|Spiced latte|81|3.2|9.9|3.2|
لاته ماسالا با شیر بادام|Spiced latte with almond milk|40|0.6|6.5|1.3|
لاته ماسالا با شیر جو دوسر|Spiced latte with oat milk|58|1|10|1.6|
لاته ماسالا بدون شکر|Sugar-free spiced latte|62|3.2|5|3.2|
کاپوچینو ماسالا|Spiced cappuccino|73|3|8.9|2.8|
کاپوچینو ماسالا با شیر بادام|Spiced cappuccino with almond milk|37|0.6|6.1|1.1|
کاپوچینو ماسالا با شیر جو دوسر|Spiced cappuccino with oat milk|52|0.9|8.9|1.4|
کاپوچینو ماسالا بدون شکر|Sugar-free spiced cappuccino|53|3|4|2.8|
موکا ماسالا|Spiced mocha|99|3|14.9|3|
موکا ماسالا با شیر بادام|Spiced mocha with almond milk|47|0.6|8.5|1.2|
موکا ماسالا با شیر جو دوسر|Spiced mocha with oat milk|79|0.9|15.5|1.5|
موکا ماسالا بدون شکر|Sugar-free spiced mocha|79|3|10|3|
لاته یخ ماسالا|Spiced iced latte|67|2.4|8.9|2.4|
لاته یخ ماسالا با شیر بادام|Spiced iced latte with almond milk|35|0.5|6.1|1|
لاته یخ ماسالا با شیر جو دوسر|Spiced iced latte with oat milk|49|0.7|8.9|1.2|
لاته یخ ماسالا بدون شکر|Sugar-free spiced iced latte|47|2.4|4|2.4|
قهوه فرانسه ماسالا|Spiced French coffee|77|3|9.4|3|
قهوه فرانسه ماسالا با شیر بادام|Spiced French coffee with almond milk|38|0.6|6.3|1.2|
قهوه فرانسه ماسالا با شیر جو دوسر|Spiced French coffee with oat milk|55|0.9|9.4|1.5|
قهوه فرانسه ماسالا بدون شکر|Sugar-free spiced French coffee|57|3|4.5|3|
فلت وایت ماسالا|Spiced flat white|85|3.6|9.8|3.5|
فلت وایت ماسالا با شیر بادام|Spiced flat white with almond milk|41|0.7|6.4|1.4|
فلت وایت ماسالا با شیر جو دوسر|Spiced flat white with oat milk|59|1.1|9.8|1.8|
فلت وایت ماسالا بدون شکر|Sugar-free spiced flat white|65|3.6|4.8|3.5|
لاته کدو حلوایی ادویه‌دار|Pumpkin spice latte|86|3.2|11.1|3.2|
لاته کدو حلوایی ادویه‌دار با شیر بادام|Pumpkin spice latte with almond milk|44|0.6|7.5|1.3|
لاته کدو حلوایی ادویه‌دار با شیر جو دوسر|Pumpkin spice latte with oat milk|62|1|11|1.6|
لاته کدو حلوایی ادویه‌دار بدون شکر|Sugar-free pumpkin spice latte|62|3.2|5|3.2|
کاپوچینو کدو حلوایی ادویه‌دار|Pumpkin spice cappuccino|77|3|10.1|2.8|
کاپوچینو کدو حلوایی ادویه‌دار با شیر بادام|Pumpkin spice cappuccino with almond milk|41|0.6|7.1|1.1|
کاپوچینو کدو حلوایی ادویه‌دار با شیر جو دوسر|Pumpkin spice cappuccino with oat milk|56|0.9|9.9|1.4|
کاپوچینو کدو حلوایی ادویه‌دار بدون شکر|Sugar-free pumpkin spice cappuccino|53|3|4|2.8|
موکا کدو حلوایی ادویه‌دار|Pumpkin spice mocha|103|3|16.1|3|
موکا کدو حلوایی ادویه‌دار با شیر بادام|Pumpkin spice mocha with almond milk|51|0.6|9.5|1.2|
موکا کدو حلوایی ادویه‌دار با شیر جو دوسر|Pumpkin spice mocha with oat milk|83|0.9|16.5|1.5|
موکا کدو حلوایی ادویه‌دار بدون شکر|Sugar-free pumpkin spice mocha|79|3|10|3|
لاته یخ کدو حلوایی ادویه‌دار|Pumpkin spice iced latte|71|2.4|10.1|2.4|
لاته یخ کدو حلوایی ادویه‌دار با شیر بادام|Pumpkin spice iced latte with almond milk|39|0.5|7.1|1|
لاته یخ کدو حلوایی ادویه‌دار با شیر جو دوسر|Pumpkin spice iced latte with oat milk|53|0.7|9.9|1.2|
لاته یخ کدو حلوایی ادویه‌دار بدون شکر|Sugar-free pumpkin spice iced latte|47|2.4|4|2.4|
قهوه فرانسه کدو حلوایی ادویه‌دار|Pumpkin spice French coffee|81|3|10.6|3|
قهوه فرانسه کدو حلوایی ادویه‌دار با شیر بادام|Pumpkin spice French coffee with almond milk|42|0.6|7.3|1.2|
قهوه فرانسه کدو حلوایی ادویه‌دار با شیر جو دوسر|Pumpkin spice French coffee with oat milk|59|0.9|10.4|1.5|
قهوه فرانسه کدو حلوایی ادویه‌دار بدون شکر|Sugar-free pumpkin spice French coffee|57|3|4.5|3|
فلت وایت کدو حلوایی ادویه‌دار|Pumpkin spice flat white|89|3.6|10.9|3.5|
فلت وایت کدو حلوایی ادویه‌دار با شیر بادام|Pumpkin spice flat white with almond milk|45|0.7|7.4|1.4|
فلت وایت کدو حلوایی ادویه‌دار با شیر جو دوسر|Pumpkin spice flat white with oat milk|63|1.1|10.8|1.8|
فلت وایت کدو حلوایی ادویه‌دار بدون شکر|Sugar-free pumpkin spice flat white|65|3.6|4.8|3.5|
لاته لیمو|Lemon latte|79|3.2|9.4|3.2|
لاته لیمو با شیر بادام|Lemon latte with almond milk|38|0.6|6|1.3|
لاته لیمو با شیر جو دوسر|Lemon latte with oat milk|56|1|9.5|1.6|
لاته لیمو بدون شکر|Sugar-free lemon latte|62|3.2|5|3.2|
کاپوچینو لیمو|Lemon cappuccino|71|3|8.4|2.8|
کاپوچینو لیمو با شیر بادام|Lemon cappuccino with almond milk|35|0.6|5.6|1.1|
کاپوچینو لیمو با شیر جو دوسر|Lemon cappuccino with oat milk|50|0.9|8.4|1.4|
کاپوچینو لیمو بدون شکر|Sugar-free lemon cappuccino|53|3|4|2.8|
موکا لیمو|Lemon mocha|97|3|14.4|3|
موکا لیمو با شیر بادام|Lemon mocha with almond milk|45|0.6|8|1.2|
موکا لیمو با شیر جو دوسر|Lemon mocha with oat milk|77|0.9|15|1.5|
موکا لیمو بدون شکر|Sugar-free lemon mocha|79|3|10|3|
لاته یخ لیمو|Lemon iced latte|65|2.4|8.4|2.4|
لاته یخ لیمو با شیر بادام|Lemon iced latte with almond milk|33|0.5|5.6|1|
لاته یخ لیمو با شیر جو دوسر|Lemon iced latte with oat milk|47|0.7|8.4|1.2|
لاته یخ لیمو بدون شکر|Sugar-free lemon iced latte|47|2.4|4|2.4|
قهوه فرانسه لیمو|Lemon French coffee|75|3|8.9|3|
قهوه فرانسه لیمو با شیر بادام|Lemon French coffee with almond milk|36|0.6|5.8|1.2|
قهوه فرانسه لیمو با شیر جو دوسر|Lemon French coffee with oat milk|53|0.9|8.9|1.5|
قهوه فرانسه لیمو بدون شکر|Sugar-free lemon French coffee|57|3|4.5|3|
فلت وایت لیمو|Lemon flat white|83|3.6|9.2|3.5|
فلت وایت لیمو با شیر بادام|Lemon flat white with almond milk|39|0.7|5.9|1.4|
فلت وایت لیمو با شیر جو دوسر|Lemon flat white with oat milk|57|1.1|9.3|1.8|
فلت وایت لیمو بدون شکر|Sugar-free lemon flat white|65|3.6|4.8|3.5|
لاته نارنگی|Mandarin latte|79|3.2|9.4|3.2|
لاته نارنگی با شیر بادام|Mandarin latte with almond milk|38|0.6|6|1.3|
لاته نارنگی با شیر جو دوسر|Mandarin latte with oat milk|56|1|9.5|1.6|
لاته نارنگی بدون شکر|Sugar-free mandarin latte|62|3.2|5|3.2|
کاپوچینو نارنگی|Mandarin cappuccino|71|3|8.4|2.8|
کاپوچینو نارنگی با شیر بادام|Mandarin cappuccino with almond milk|35|0.6|5.6|1.1|
کاپوچینو نارنگی با شیر جو دوسر|Mandarin cappuccino with oat milk|50|0.9|8.4|1.4|
کاپوچینو نارنگی بدون شکر|Sugar-free mandarin cappuccino|53|3|4|2.8|
موکا نارنگی|Mandarin mocha|97|3|14.4|3|
موکا نارنگی با شیر بادام|Mandarin mocha with almond milk|45|0.6|8|1.2|
موکا نارنگی با شیر جو دوسر|Mandarin mocha with oat milk|77|0.9|15|1.5|
موکا نارنگی بدون شکر|Sugar-free mandarin mocha|79|3|10|3|
لاته یخ نارنگی|Mandarin iced latte|65|2.4|8.4|2.4|
لاته یخ نارنگی با شیر بادام|Mandarin iced latte with almond milk|33|0.5|5.6|1|
لاته یخ نارنگی با شیر جو دوسر|Mandarin iced latte with oat milk|47|0.7|8.4|1.2|
لاته یخ نارنگی بدون شکر|Sugar-free mandarin iced latte|47|2.4|4|2.4|
قهوه فرانسه نارنگی|Mandarin French coffee|75|3|8.9|3|
قهوه فرانسه نارنگی با شیر بادام|Mandarin French coffee with almond milk|36|0.6|5.8|1.2|
قهوه فرانسه نارنگی با شیر جو دوسر|Mandarin French coffee with oat milk|53|0.9|8.9|1.5|
قهوه فرانسه نارنگی بدون شکر|Sugar-free mandarin French coffee|57|3|4.5|3|
فلت وایت نارنگی|Mandarin flat white|83|3.6|9.2|3.5|
فلت وایت نارنگی با شیر بادام|Mandarin flat white with almond milk|39|0.7|5.9|1.4|
فلت وایت نارنگی با شیر جو دوسر|Mandarin flat white with oat milk|57|1.1|9.3|1.8|
فلت وایت نارنگی بدون شکر|Sugar-free mandarin flat white|65|3.6|4.8|3.5|
لاته توت‌فرنگی|Strawberry latte|81|3.2|9.9|3.2|
لاته توت‌فرنگی با شیر بادام|Strawberry latte with almond milk|40|0.6|6.5|1.3|
لاته توت‌فرنگی با شیر جو دوسر|Strawberry latte with oat milk|58|1|10|1.6|
لاته توت‌فرنگی بدون شکر|Sugar-free strawberry latte|62|3.2|5|3.2|
کاپوچینو توت‌فرنگی|Strawberry cappuccino|73|3|8.9|2.8|
کاپوچینو توت‌فرنگی با شیر بادام|Strawberry cappuccino with almond milk|37|0.6|6.1|1.1|
کاپوچینو توت‌فرنگی با شیر جو دوسر|Strawberry cappuccino with oat milk|52|0.9|8.9|1.4|
کاپوچینو توت‌فرنگی بدون شکر|Sugar-free strawberry cappuccino|53|3|4|2.8|
موکا توت‌فرنگی|Strawberry mocha|99|3|14.9|3|
موکا توت‌فرنگی با شیر بادام|Strawberry mocha with almond milk|47|0.6|8.5|1.2|
موکا توت‌فرنگی با شیر جو دوسر|Strawberry mocha with oat milk|79|0.9|15.5|1.5|
موکا توت‌فرنگی بدون شکر|Sugar-free strawberry mocha|79|3|10|3|
`;
const S4 = `
لاته یخ توت‌فرنگی|Strawberry iced latte|67|2.4|8.9|2.4|
لاته یخ توت‌فرنگی با شیر بادام|Strawberry iced latte with almond milk|35|0.5|6.1|1|
لاته یخ توت‌فرنگی با شیر جو دوسر|Strawberry iced latte with oat milk|49|0.7|8.9|1.2|
لاته یخ توت‌فرنگی بدون شکر|Sugar-free strawberry iced latte|47|2.4|4|2.4|
قهوه فرانسه توت‌فرنگی|Strawberry French coffee|77|3|9.4|3|
قهوه فرانسه توت‌فرنگی با شیر بادام|Strawberry French coffee with almond milk|38|0.6|6.3|1.2|
قهوه فرانسه توت‌فرنگی با شیر جو دوسر|Strawberry French coffee with oat milk|55|0.9|9.4|1.5|
قهوه فرانسه توت‌فرنگی بدون شکر|Sugar-free strawberry French coffee|57|3|4.5|3|
فلت وایت توت‌فرنگی|Strawberry flat white|85|3.6|9.8|3.5|
فلت وایت توت‌فرنگی با شیر بادام|Strawberry flat white with almond milk|41|0.7|6.4|1.4|
فلت وایت توت‌فرنگی با شیر جو دوسر|Strawberry flat white with oat milk|59|1.1|9.8|1.8|
فلت وایت توت‌فرنگی بدون شکر|Sugar-free strawberry flat white|65|3.6|4.8|3.5|
لاته زنجبیل|Ginger latte|79|3.2|9.4|3.2|
لاته زنجبیل با شیر بادام|Ginger latte with almond milk|38|0.6|6|1.3|
لاته زنجبیل با شیر جو دوسر|Ginger latte with oat milk|56|1|9.5|1.6|
لاته زنجبیل بدون شکر|Sugar-free ginger latte|62|3.2|5|3.2|
کاپوچینو زنجبیل|Ginger cappuccino|71|3|8.4|2.8|
کاپوچینو زنجبیل با شیر بادام|Ginger cappuccino with almond milk|35|0.6|5.6|1.1|
کاپوچینو زنجبیل با شیر جو دوسر|Ginger cappuccino with oat milk|50|0.9|8.4|1.4|
کاپوچینو زنجبیل بدون شکر|Sugar-free ginger cappuccino|53|3|4|2.8|
موکا زنجبیل|Ginger mocha|97|3|14.4|3|
موکا زنجبیل با شیر بادام|Ginger mocha with almond milk|45|0.6|8|1.2|
موکا زنجبیل با شیر جو دوسر|Ginger mocha with oat milk|77|0.9|15|1.5|
موکا زنجبیل بدون شکر|Sugar-free ginger mocha|79|3|10|3|
لاته یخ زنجبیل|Ginger iced latte|65|2.4|8.4|2.4|
لاته یخ زنجبیل با شیر بادام|Ginger iced latte with almond milk|33|0.5|5.6|1|
لاته یخ زنجبیل با شیر جو دوسر|Ginger iced latte with oat milk|47|0.7|8.4|1.2|
لاته یخ زنجبیل بدون شکر|Sugar-free ginger iced latte|47|2.4|4|2.4|
قهوه فرانسه زنجبیل|Ginger French coffee|75|3|8.9|3|
قهوه فرانسه زنجبیل با شیر بادام|Ginger French coffee with almond milk|36|0.6|5.8|1.2|
قهوه فرانسه زنجبیل با شیر جو دوسر|Ginger French coffee with oat milk|53|0.9|8.9|1.5|
قهوه فرانسه زنجبیل بدون شکر|Sugar-free ginger French coffee|57|3|4.5|3|
فلت وایت زنجبیل|Ginger flat white|83|3.6|9.2|3.5|
فلت وایت زنجبیل با شیر بادام|Ginger flat white with almond milk|39|0.7|5.9|1.4|
فلت وایت زنجبیل با شیر جو دوسر|Ginger flat white with oat milk|57|1.1|9.3|1.8|
فلت وایت زنجبیل بدون شکر|Sugar-free ginger flat white|65|3.6|4.8|3.5|
لاته شکلات سفید|White chocolate latte|84|3.2|10.5|3.2|
لاته شکلات سفید با شیر بادام|White chocolate latte with almond milk|42|0.6|7|1.3|
لاته شکلات سفید با شیر جو دوسر|White chocolate latte with oat milk|60|1|10.5|1.6|
لاته شکلات سفید بدون شکر|Sugar-free white chocolate latte|62|3.2|5|3.2|
کاپوچینو شکلات سفید|White chocolate cappuccino|75|3|9.5|2.8|
کاپوچینو شکلات سفید با شیر بادام|White chocolate cappuccino with almond milk|39|0.6|6.6|1.1|
کاپوچینو شکلات سفید با شیر جو دوسر|White chocolate cappuccino with oat milk|54|0.9|9.4|1.4|
کاپوچینو شکلات سفید بدون شکر|Sugar-free white chocolate cappuccino|53|3|4|2.8|
موکا شکلات سفید|White chocolate mocha|101|3|15.5|3|
موکا شکلات سفید با شیر بادام|White chocolate mocha with almond milk|49|0.6|9|1.2|
موکا شکلات سفید با شیر جو دوسر|White chocolate mocha with oat milk|81|0.9|16|1.5|
موکا شکلات سفید بدون شکر|Sugar-free white chocolate mocha|79|3|10|3|
لاته یخ شکلات سفید|White chocolate iced latte|69|2.4|9.5|2.4|
لاته یخ شکلات سفید با شیر بادام|White chocolate iced latte with almond milk|37|0.5|6.6|1|
لاته یخ شکلات سفید با شیر جو دوسر|White chocolate iced latte with oat milk|51|0.7|9.4|1.2|
لاته یخ شکلات سفید بدون شکر|Sugar-free white chocolate iced latte|47|2.4|4|2.4|
قهوه فرانسه شکلات سفید|White chocolate French coffee|79|3|10|3|
قهوه فرانسه شکلات سفید با شیر بادام|White chocolate French coffee with almond milk|40|0.6|6.8|1.2|
قهوه فرانسه شکلات سفید با شیر جو دوسر|White chocolate French coffee with oat milk|57|0.9|9.9|1.5|
قهوه فرانسه شکلات سفید بدون شکر|Sugar-free white chocolate French coffee|57|3|4.5|3|
فلت وایت شکلات سفید|White chocolate flat white|87|3.6|10.3|3.5|
فلت وایت شکلات سفید با شیر بادام|White chocolate flat white with almond milk|43|0.7|6.9|1.4|
فلت وایت شکلات سفید با شیر جو دوسر|White chocolate flat white with oat milk|61|1.1|10.3|1.8|
فلت وایت شکلات سفید بدون شکر|Sugar-free white chocolate flat white|65|3.6|4.8|3.5|
لاته شیره افرا|Maple latte|84|3.2|10.5|3.2|
لاته شیره افرا با شیر بادام|Maple latte with almond milk|42|0.6|7|1.3|
لاته شیره افرا با شیر جو دوسر|Maple latte with oat milk|60|1|10.5|1.6|
لاته شیره افرا بدون شکر|Sugar-free maple latte|62|3.2|5|3.2|
کاپوچینو شیره افرا|Maple cappuccino|75|3|9.5|2.8|
کاپوچینو شیره افرا با شیر بادام|Maple cappuccino with almond milk|39|0.6|6.6|1.1|
کاپوچینو شیره افرا با شیر جو دوسر|Maple cappuccino with oat milk|54|0.9|9.4|1.4|
کاپوچینو شیره افرا بدون شکر|Sugar-free maple cappuccino|53|3|4|2.8|
موکا شیره افرا|Maple mocha|101|3|15.5|3|
موکا شیره افرا با شیر بادام|Maple mocha with almond milk|49|0.6|9|1.2|
موکا شیره افرا با شیر جو دوسر|Maple mocha with oat milk|81|0.9|16|1.5|
موکا شیره افرا بدون شکر|Sugar-free maple mocha|79|3|10|3|
لاته یخ شیره افرا|Maple iced latte|69|2.4|9.5|2.4|
لاته یخ شیره افرا با شیر بادام|Maple iced latte with almond milk|37|0.5|6.6|1|
لاته یخ شیره افرا با شیر جو دوسر|Maple iced latte with oat milk|51|0.7|9.4|1.2|
لاته یخ شیره افرا بدون شکر|Sugar-free maple iced latte|47|2.4|4|2.4|
قهوه فرانسه شیره افرا|Maple French coffee|79|3|10|3|
قهوه فرانسه شیره افرا با شیر بادام|Maple French coffee with almond milk|40|0.6|6.8|1.2|
قهوه فرانسه شیره افرا با شیر جو دوسر|Maple French coffee with oat milk|57|0.9|9.9|1.5|
قهوه فرانسه شیره افرا بدون شکر|Sugar-free maple French coffee|57|3|4.5|3|
فلت وایت شیره افرا|Maple flat white|87|3.6|10.3|3.5|
فلت وایت شیره افرا با شیر بادام|Maple flat white with almond milk|43|0.7|6.9|1.4|
فلت وایت شیره افرا با شیر جو دوسر|Maple flat white with oat milk|61|1.1|10.3|1.8|
فلت وایت شیره افرا بدون شکر|Sugar-free maple flat white|65|3.6|4.8|3.5|
لاته ارده|Tahini latte|81|3.2|9.9|3.2|
لاته ارده با شیر بادام|Tahini latte with almond milk|40|0.6|6.5|1.3|
لاته ارده با شیر جو دوسر|Tahini latte with oat milk|58|1|10|1.6|
لاته ارده بدون شکر|Sugar-free tahini latte|62|3.2|5|3.2|
کاپوچینو ارده|Tahini cappuccino|73|3|8.9|2.8|
کاپوچینو ارده با شیر بادام|Tahini cappuccino with almond milk|37|0.6|6.1|1.1|
کاپوچینو ارده با شیر جو دوسر|Tahini cappuccino with oat milk|52|0.9|8.9|1.4|
کاپوچینو ارده بدون شکر|Sugar-free tahini cappuccino|53|3|4|2.8|
موکا ارده|Tahini mocha|99|3|14.9|3|
موکا ارده با شیر بادام|Tahini mocha with almond milk|47|0.6|8.5|1.2|
موکا ارده با شیر جو دوسر|Tahini mocha with oat milk|79|0.9|15.5|1.5|
موکا ارده بدون شکر|Sugar-free tahini mocha|79|3|10|3|
لاته یخ ارده|Tahini iced latte|67|2.4|8.9|2.4|
لاته یخ ارده با شیر بادام|Tahini iced latte with almond milk|35|0.5|6.1|1|
لاته یخ ارده با شیر جو دوسر|Tahini iced latte with oat milk|49|0.7|8.9|1.2|
لاته یخ ارده بدون شکر|Sugar-free tahini iced latte|47|2.4|4|2.4|
قهوه فرانسه ارده|Tahini French coffee|77|3|9.4|3|
قهوه فرانسه ارده با شیر بادام|Tahini French coffee with almond milk|38|0.6|6.3|1.2|
قهوه فرانسه ارده با شیر جو دوسر|Tahini French coffee with oat milk|55|0.9|9.4|1.5|
قهوه فرانسه ارده بدون شکر|Sugar-free tahini French coffee|57|3|4.5|3|
فلت وایت ارده|Tahini flat white|85|3.6|9.8|3.5|
فلت وایت ارده با شیر بادام|Tahini flat white with almond milk|41|0.7|6.4|1.4|
فلت وایت ارده با شیر جو دوسر|Tahini flat white with oat milk|59|1.1|9.8|1.8|
فلت وایت ارده بدون شکر|Sugar-free tahini flat white|65|3.6|4.8|3.5|
لاته کره بادام‌زمینی|Peanut butter latte|84|3.2|10.5|3.2|
لاته کره بادام‌زمینی با شیر بادام|Peanut butter latte with almond milk|42|0.6|7|1.3|
لاته کره بادام‌زمینی با شیر جو دوسر|Peanut butter latte with oat milk|60|1|10.5|1.6|
لاته کره بادام‌زمینی بدون شکر|Sugar-free peanut butter latte|62|3.2|5|3.2|
کاپوچینو کره بادام‌زمینی|Peanut butter cappuccino|75|3|9.5|2.8|
کاپوچینو کره بادام‌زمینی با شیر بادام|Peanut butter cappuccino with almond milk|39|0.6|6.6|1.1|
کاپوچینو کره بادام‌زمینی با شیر جو دوسر|Peanut butter cappuccino with oat milk|54|0.9|9.4|1.4|
کاپوچینو کره بادام‌زمینی بدون شکر|Sugar-free peanut butter cappuccino|53|3|4|2.8|
موکا کره بادام‌زمینی|Peanut butter mocha|101|3|15.5|3|
موکا کره بادام‌زمینی با شیر بادام|Peanut butter mocha with almond milk|49|0.6|9|1.2|
موکا کره بادام‌زمینی با شیر جو دوسر|Peanut butter mocha with oat milk|81|0.9|16|1.5|
موکا کره بادام‌زمینی بدون شکر|Sugar-free peanut butter mocha|79|3|10|3|
لاته یخ کره بادام‌زمینی|Peanut butter iced latte|69|2.4|9.5|2.4|
لاته یخ کره بادام‌زمینی با شیر بادام|Peanut butter iced latte with almond milk|37|0.5|6.6|1|
لاته یخ کره بادام‌زمینی با شیر جو دوسر|Peanut butter iced latte with oat milk|51|0.7|9.4|1.2|
لاته یخ کره بادام‌زمینی بدون شکر|Sugar-free peanut butter iced latte|47|2.4|4|2.4|
قهوه فرانسه کره بادام‌زمینی|Peanut butter French coffee|79|3|10|3|
قهوه فرانسه کره بادام‌زمینی با شیر بادام|Peanut butter French coffee with almond milk|40|0.6|6.8|1.2|
قهوه فرانسه کره بادام‌زمینی با شیر جو دوسر|Peanut butter French coffee with oat milk|57|0.9|9.9|1.5|
قهوه فرانسه کره بادام‌زمینی بدون شکر|Sugar-free peanut butter French coffee|57|3|4.5|3|
فلت وایت کره بادام‌زمینی|Peanut butter flat white|87|3.6|10.3|3.5|
فلت وایت کره بادام‌زمینی با شیر بادام|Peanut butter flat white with almond milk|43|0.7|6.9|1.4|
فلت وایت کره بادام‌زمینی با شیر جو دوسر|Peanut butter flat white with oat milk|61|1.1|10.3|1.8|
فلت وایت کره بادام‌زمینی بدون شکر|Sugar-free peanut butter flat white|65|3.6|4.8|3.5|
لاته تیرامیسو|Tiramisu latte|84|3.2|10.5|3.2|
لاته تیرامیسو با شیر بادام|Tiramisu latte with almond milk|42|0.6|7|1.3|
لاته تیرامیسو با شیر جو دوسر|Tiramisu latte with oat milk|60|1|10.5|1.6|
لاته تیرامیسو بدون شکر|Sugar-free tiramisu latte|62|3.2|5|3.2|
کاپوچینو تیرامیسو|Tiramisu cappuccino|75|3|9.5|2.8|
کاپوچینو تیرامیسو با شیر بادام|Tiramisu cappuccino with almond milk|39|0.6|6.6|1.1|
کاپوچینو تیرامیسو با شیر جو دوسر|Tiramisu cappuccino with oat milk|54|0.9|9.4|1.4|
کاپوچینو تیرامیسو بدون شکر|Sugar-free tiramisu cappuccino|53|3|4|2.8|
موکا تیرامیسو|Tiramisu mocha|101|3|15.5|3|
موکا تیرامیسو با شیر بادام|Tiramisu mocha with almond milk|49|0.6|9|1.2|
موکا تیرامیسو با شیر جو دوسر|Tiramisu mocha with oat milk|81|0.9|16|1.5|
موکا تیرامیسو بدون شکر|Sugar-free tiramisu mocha|79|3|10|3|
لاته یخ تیرامیسو|Tiramisu iced latte|69|2.4|9.5|2.4|
لاته یخ تیرامیسو با شیر بادام|Tiramisu iced latte with almond milk|37|0.5|6.6|1|
لاته یخ تیرامیسو با شیر جو دوسر|Tiramisu iced latte with oat milk|51|0.7|9.4|1.2|
لاته یخ تیرامیسو بدون شکر|Sugar-free tiramisu iced latte|47|2.4|4|2.4|
قهوه فرانسه تیرامیسو|Tiramisu French coffee|79|3|10|3|
قهوه فرانسه تیرامیسو با شیر بادام|Tiramisu French coffee with almond milk|40|0.6|6.8|1.2|
قهوه فرانسه تیرامیسو با شیر جو دوسر|Tiramisu French coffee with oat milk|57|0.9|9.9|1.5|
قهوه فرانسه تیرامیسو بدون شکر|Sugar-free tiramisu French coffee|57|3|4.5|3|
فلت وایت تیرامیسو|Tiramisu flat white|87|3.6|10.3|3.5|
فلت وایت تیرامیسو با شیر بادام|Tiramisu flat white with almond milk|43|0.7|6.9|1.4|
فلت وایت تیرامیسو با شیر جو دوسر|Tiramisu flat white with oat milk|61|1.1|10.3|1.8|
فلت وایت تیرامیسو بدون شکر|Sugar-free tiramisu flat white|65|3.6|4.8|3.5|
لاته آیریش|Irish cream flavor latte|84|3.2|10.5|3.2|
لاته آیریش با شیر بادام|Irish cream flavor latte with almond milk|42|0.6|7|1.3|
لاته آیریش با شیر جو دوسر|Irish cream flavor latte with oat milk|60|1|10.5|1.6|
لاته آیریش بدون شکر|Sugar-free Irish cream flavor latte|62|3.2|5|3.2|
کاپوچینو آیریش|Irish cream flavor cappuccino|75|3|9.5|2.8|
کاپوچینو آیریش با شیر بادام|Irish cream flavor cappuccino with almond milk|39|0.6|6.6|1.1|
کاپوچینو آیریش با شیر جو دوسر|Irish cream flavor cappuccino with oat milk|54|0.9|9.4|1.4|
کاپوچینو آیریش بدون شکر|Sugar-free Irish cream flavor cappuccino|53|3|4|2.8|
موکا آیریش|Irish cream flavor mocha|101|3|15.5|3|
موکا آیریش با شیر بادام|Irish cream flavor mocha with almond milk|49|0.6|9|1.2|
موکا آیریش با شیر جو دوسر|Irish cream flavor mocha with oat milk|81|0.9|16|1.5|
موکا آیریش بدون شکر|Sugar-free Irish cream flavor mocha|79|3|10|3|
لاته یخ آیریش|Irish cream flavor iced latte|69|2.4|9.5|2.4|
لاته یخ آیریش با شیر بادام|Irish cream flavor iced latte with almond milk|37|0.5|6.6|1|
لاته یخ آیریش با شیر جو دوسر|Irish cream flavor iced latte with oat milk|51|0.7|9.4|1.2|
لاته یخ آیریش بدون شکر|Sugar-free Irish cream flavor iced latte|47|2.4|4|2.4|
قهوه فرانسه آیریش|Irish cream flavor French coffee|79|3|10|3|
قهوه فرانسه آیریش با شیر بادام|Irish cream flavor French coffee with almond milk|40|0.6|6.8|1.2|
قهوه فرانسه آیریش با شیر جو دوسر|Irish cream flavor French coffee with oat milk|57|0.9|9.9|1.5|
قهوه فرانسه آیریش بدون شکر|Sugar-free Irish cream flavor French coffee|57|3|4.5|3|
فلت وایت آیریش|Irish cream flavor flat white|87|3.6|10.3|3.5|
فلت وایت آیریش با شیر بادام|Irish cream flavor flat white with almond milk|43|0.7|6.9|1.4|
فلت وایت آیریش با شیر جو دوسر|Irish cream flavor flat white with oat milk|61|1.1|10.3|1.8|
فلت وایت آیریش بدون شکر|Sugar-free Irish cream flavor flat white|65|3.6|4.8|3.5|
لاته آجیل مخلوط|Mixed nut latte|84|3.2|10.5|3.2|
لاته آجیل مخلوط با شیر بادام|Mixed nut latte with almond milk|42|0.6|7|1.3|
لاته آجیل مخلوط با شیر جو دوسر|Mixed nut latte with oat milk|60|1|10.5|1.6|
لاته آجیل مخلوط بدون شکر|Sugar-free mixed nut latte|62|3.2|5|3.2|
کاپوچینو آجیل مخلوط|Mixed nut cappuccino|75|3|9.5|2.8|
کاپوچینو آجیل مخلوط با شیر بادام|Mixed nut cappuccino with almond milk|39|0.6|6.6|1.1|
کاپوچینو آجیل مخلوط با شیر جو دوسر|Mixed nut cappuccino with oat milk|54|0.9|9.4|1.4|
کاپوچینو آجیل مخلوط بدون شکر|Sugar-free mixed nut cappuccino|53|3|4|2.8|
موکا آجیل مخلوط|Mixed nut mocha|101|3|15.5|3|
موکا آجیل مخلوط با شیر بادام|Mixed nut mocha with almond milk|49|0.6|9|1.2|
موکا آجیل مخلوط با شیر جو دوسر|Mixed nut mocha with oat milk|81|0.9|16|1.5|
موکا آجیل مخلوط بدون شکر|Sugar-free mixed nut mocha|79|3|10|3|
لاته یخ آجیل مخلوط|Mixed nut iced latte|69|2.4|9.5|2.4|
لاته یخ آجیل مخلوط با شیر بادام|Mixed nut iced latte with almond milk|37|0.5|6.6|1|
لاته یخ آجیل مخلوط با شیر جو دوسر|Mixed nut iced latte with oat milk|51|0.7|9.4|1.2|
لاته یخ آجیل مخلوط بدون شکر|Sugar-free mixed nut iced latte|47|2.4|4|2.4|
قهوه فرانسه آجیل مخلوط|Mixed nut French coffee|79|3|10|3|
قهوه فرانسه آجیل مخلوط با شیر بادام|Mixed nut French coffee with almond milk|40|0.6|6.8|1.2|
قهوه فرانسه آجیل مخلوط با شیر جو دوسر|Mixed nut French coffee with oat milk|57|0.9|9.9|1.5|
قهوه فرانسه آجیل مخلوط بدون شکر|Sugar-free mixed nut French coffee|57|3|4.5|3|
فلت وایت آجیل مخلوط|Mixed nut flat white|87|3.6|10.3|3.5|
فلت وایت آجیل مخلوط با شیر بادام|Mixed nut flat white with almond milk|43|0.7|6.9|1.4|
فلت وایت آجیل مخلوط با شیر جو دوسر|Mixed nut flat white with oat milk|61|1.1|10.3|1.8|
فلت وایت آجیل مخلوط بدون شکر|Sugar-free mixed nut flat white|65|3.6|4.8|3.5|
اسپرسو تک|Single espresso|4|0.1|0.5|0.2|
اسپرسو دبل|Double espresso|4|0.1|0.5|0.2|
ریسترتو|Ristretto|4|0.1|0.5|0.2|
لانگو|Lungo|2|0.1|0.3|0.1|
آمریکانو|Americano|2|0.1|0.3|0|
آمریکانو یخ|Iced americano|2|0.1|0.3|0|
قهوه دمی|Drip coffee|1|0.1|0|0|
قهوه فرانسه ساده|Plain French press coffee|1|0.1|0|0|
کلد برو با شیر|Cold brew with milk|32|1.5|3|1.5|
نیترو کلد برو|Nitro cold brew|1|0.1|0|0|
قهوه عربی|Arabic coffee|3|0.2|0.5|0|
قهوه هل|Cardamom coffee|3|0.2|0.5|0|
قهوه زنجبیل|Ginger coffee|3|0.2|0.5|0|
قهوه دارچین|Cinnamon coffee|3|0.2|0.5|0|
قهوه بولت‌پروف|Bulletproof coffee|91|0.3|0|10|
اسپرسو تونیک|Espresso tonic|32|0.1|8|0|
اسپرسو شیرین|Sweet espresso|33|0.1|8|0.1|
افوگاتو|Affogato|172|3|22|8|
افوگاتو شکلاتی|Chocolate affogato|197|3|26|9|
افوگاتو پسته|Pistachio affogato|192|3.5|22|10|
قهوه با بستنی|Coffee with ice cream|136|2.5|18|6|
قهوه گلاسه|Coffee glace|136|2.5|18|6|
کافه فردو|Cafe freddo|1|0.1|0|0|
دالگونا|Dalgona coffee|87|3|12|3|
دالگونا یخ|Iced dalgona coffee|79|3|10|3|
قهوه ویتنامی یخ|Iced Vietnamese coffee|110|2.5|16|4|
قهوه اسپانیایی|Cafe bombon|115|2|20|3|
قهوه ایرلندی بدون الکل|Non-alcoholic Irish coffee|69|1|5|5|
شکلات داغ ایتالیایی|Italian hot chocolate|140|3.5|18|6|
شکلات داغ سفید|White hot chocolate|125|3|17|5|
شکلات داغ با مارشمالو|Hot chocolate with marshmallow|119|3|20|3|
شکلات داغ فندقی|Hazelnut hot chocolate|130|3.2|18|5|
شکلات داغ تلخ|Dark hot chocolate|124|3.5|14|6|
شکلات داغ نعنایی|Mint hot chocolate|111|3|18|3|
شکلات داغ فلفلی|Chili hot chocolate|116|3|17|4|
شکلات داغ با خامه|Hot chocolate with whipped cream|156|3|18|8|
شکلات داغ کارامل|Caramel hot chocolate|128|3|20|4|
شکلات داغ پرتقالی|Orange hot chocolate|111|3|18|3|
شکلات داغ نارگیل|Coconut hot chocolate|126|2|16|6|
شکلات داغ با شیر بادام|Hot chocolate with almond milk|81|1.5|12|3|
شکلات داغ با شیر جو دوسر|Hot chocolate with oat milk|105|1.5|18|3|
شکلات داغ بدون شکر|Sugar-free hot chocolate|63|3|6|3|
شکلات داغ زعفرانی|Saffron hot chocolate|116|3|17|4|
شکلات داغ دارچینی|Cinnamon hot chocolate|112|3|17|3.5|
شکلات داغ با پودر|Powder hot chocolate|98|3|16|2.5|
شکلات داغ ورزشی|Protein hot chocolate|82|8|8|2|
کاکائو با خامه|Cocoa with cream|135|3|15|7|
میلک‌شیک وانیل|Vanilla milkshake|117|3.2|16|4.5|
میلک‌شیک وانیل کم‌چرب|Low-fat vanilla milkshake|90|3.4|16|1.4|
میلک‌شیک وانیل پروتئینی|Protein vanilla milkshake|93|8|10.1|2.2|
میلک‌شیک وانیل با شیر بادام|Almond milk vanilla shake|79|1|12|3|
فراپه وانیل|Vanilla frappe|108|1.2|19|3|
فراپه وانیل با خامه|Vanilla frappe with whipped cream|139|1.2|19|6.5|
آیس بلندد وانیل|Blended iced vanilla|98|1|18|2.5|
اسموتی وانیل و شیر|Milk vanilla smoothie|94|2.5|16|2.2|
شیک وانیل با بستنی|Vanilla ice cream shake|151|3.2|20|6.5|
یخ‌شکلات وانیل|Iced chocolate with vanilla|93|2.5|14|3|
میلک‌شیک شکلات|Chocolate milkshake|142|4.2|19|5.5|
میلک‌شیک شکلات کم‌چرب|Low-fat chocolate milkshake|110|4.4|19|1.8|
میلک‌شیک شکلات پروتئینی|Protein chocolate milkshake|110|9|12.2|2.8|
میلک‌شیک شکلات با شیر بادام|Almond milk chocolate shake|102|1.5|15|4|
فراپه شکلات|Chocolate frappe|131|1.7|22|4|
فراپه شکلات با خامه|Chocolate frappe with whipped cream|162|1.7|22|7.5|
آیس بلندد شکلات|Blended iced chocolate|121|1.4|21|3.5|
اسموتی شکلات و شیر|Milk chocolate smoothie|115|3.5|19|2.8|
شیک شکلات با بستنی|Chocolate ice cream shake|176|4.2|23|7.5|
یخ‌شکلات شکلات|Iced chocolate with chocolate|118|3.5|17|4|
میلک‌شیک توت‌فرنگی کم‌چرب|Low-fat strawberry milkshake|96|3.4|18|1.2|
میلک‌شیک توت‌فرنگی پروتئینی|Protein strawberry milkshake|96|8|11.5|2|
میلک‌شیک توت‌فرنگی با شیر بادام|Almond milk strawberry shake|82|1|14|2.5|
فراپه توت‌فرنگی|Strawberry frappe|111|1.2|21|2.5|
فراپه توت‌فرنگی با خامه|Strawberry frappe with whipped cream|143|1.2|21|6|
آیس بلندد توت‌فرنگی|Blended iced strawberry|102|1|20|2|
اسموتی توت‌فرنگی و شیر|Milk strawberry smoothie|100|2.5|18|2|
شیک توت‌فرنگی با بستنی|Strawberry ice cream shake|155|3.2|22|6|
یخ‌شکلات توت‌فرنگی|Iced chocolate with strawberry|96|2.5|16|2.5|
میلک‌شیک موز کم‌چرب|Low-fat banana milkshake|110|3.9|21|1.2|
میلک‌شیک موز پروتئینی|Protein banana milkshake|106|8.5|13.6|2|
میلک‌شیک موز با شیر بادام|Almond milk banana shake|96|1.2|17|2.5|
فراپه موز|Banana frappe|124|1.4|24|2.5|
فراپه موز با خامه|Banana frappe with whipped cream|156|1.4|24|6|
آیس بلندد موز|Blended iced banana|115|1.2|23|2|
اسموتی موز و شیر|Milk banana smoothie|114|3|21|2|
شیک موز با بستنی|Banana ice cream shake|169|3.7|25|6|
یخ‌شکلات موز|Iced chocolate with banana|110|3|19|2.5|
میلک‌شیک کارامل کم‌چرب|Low-fat caramel milkshake|102|3.4|19|1.4|
میلک‌شیک کارامل پروتئینی|Protein caramel milkshake|101|8|12.2|2.2|
میلک‌شیک کارامل با شیر بادام|Almond milk caramel shake|91|1|15|3|
فراپه کارامل|Caramel frappe|120|1.2|22|3|
فراپه کارامل با خامه|Caramel frappe with whipped cream|151|1.2|22|6.5|
آیس بلندد کارامل|Blended iced caramel|110|1|21|2.5|
اسموتی کارامل و شیر|Milk caramel smoothie|106|2.5|19|2.2|
شیک کارامل با بستنی|Caramel ice cream shake|163|3.2|23|6.5|
یخ‌شکلات کارامل|Iced chocolate with caramel|105|2.5|17|3|
میلک‌شیک قهوه کم‌چرب|Low-fat coffee milkshake|86|3.7|15|1.2|
میلک‌شیک قهوه پروتئینی|Protein coffee milkshake|89|8.3|9.4|2|
میلک‌شیک قهوه با شیر بادام|Almond milk coffee shake|71|1.1|11|2.5|
فراپه قهوه|Coffee frappe|100|1.3|18|2.5|
فراپه قهوه با خامه|Coffee frappe with whipped cream|131|1.3|18|6|
آیس بلندد قهوه|Blended iced coffee|90|1.1|17|2|
اسموتی قهوه و شیر|Milk coffee smoothie|89|2.8|15|2|
شیک قهوه با بستنی|Coffee ice cream shake|144|3.5|19|6|
یخ‌شکلات قهوه|Iced chocolate with coffee|86|2.8|13|2.5|
میلک‌شیک پسته کم‌چرب|Low-fat pistachio milkshake|103|5.4|15|2.4|
میلک‌شیک پسته پروتئینی|Protein pistachio milkshake|109|10|9.4|3.5|
میلک‌شیک پسته با شیر بادام|Almond milk pistachio shake|102|2|11|5.5|
فراپه پسته|Pistachio frappe|130|2.2|18|5.5|
فراپه پسته با خامه|Pistachio frappe with whipped cream|162|2.2|18|9|
آیس بلندد پسته|Blended iced pistachio|120|1.8|17|5|
اسموتی پسته و شیر|Milk pistachio smoothie|110|4.5|15|3.5|
شیک پسته با بستنی|Pistachio ice cream shake|178|5.2|19|9|
یخ‌شکلات پسته|Iced chocolate with pistachio|120|4.5|13|5.5|
میلک‌شیک اوریو کم‌چرب|Low-fat Oreo milkshake|120|4.4|21|2|
میلک‌شیک اوریو پروتئینی|Protein Oreo milkshake|117|9|13.6|3|
میلک‌شیک اوریو با شیر بادام|Almond milk Oreo shake|114|1.5|17|4.5|
فراپه اوریو|Oreo frappe|143|1.7|24|4.5|
فراپه اوریو با خامه|Oreo frappe with whipped cream|175|1.7|24|8|
آیس بلندد اوریو|Blended iced Oreo|134|1.4|23|4|
اسموتی اوریو و شیر|Milk Oreo smoothie|125|3.5|21|3|
شیک اوریو با بستنی|Oreo ice cream shake|189|4.2|25|8|
یخ‌شکلات اوریو|Iced chocolate with Oreo|130|3.5|19|4.5|
میلک‌شیک نوتلا کم‌چرب|Low-fat Nutella milkshake|129|4.9|22|2.4|
میلک‌شیک نوتلا پروتئینی|Protein Nutella milkshake|127|9.5|14.3|3.5|
میلک‌شیک نوتلا با شیر بادام|Almond milk Nutella shake|128|1.8|18|5.5|
فراپه نوتلا|Nutella frappe|157|1.9|25|5.5|
فراپه نوتلا با خامه|Nutella frappe with whipped cream|189|1.9|25|9|
آیس بلندد نوتلا|Blended iced Nutella|147|1.6|24|5|
اسموتی نوتلا و شیر|Milk Nutella smoothie|136|4|22|3.5|
شیک نوتلا با بستنی|Nutella ice cream shake|204|4.7|26|9|
یخ‌شکلات نوتلا|Iced chocolate with Nutella|146|4|20|5.5|
میلک‌شیک لوتوس|Lotus milkshake|159|4.2|22|6|
میلک‌شیک لوتوس کم‌چرب|Low-fat Lotus milkshake|124|4.4|22|2|
میلک‌شیک لوتوس پروتئینی|Protein Lotus milkshake|120|9|14.3|3|
میلک‌شیک لوتوس با شیر بادام|Almond milk Lotus shake|118|1.5|18|4.5|
فراپه لوتوس|Lotus frappe|147|1.7|25|4.5|
فراپه لوتوس با خامه|Lotus frappe with whipped cream|179|1.7|25|8|
آیس بلندد لوتوس|Blended iced Lotus|138|1.4|24|4|
اسموتی لوتوس و شیر|Milk Lotus smoothie|129|3.5|22|3|
شیک لوتوس با بستنی|Lotus ice cream shake|193|4.2|26|8|
یخ‌شکلات لوتوس|Iced chocolate with Lotus|134|3.5|20|4.5|
میلک‌شیک انبه کم‌چرب|Low-fat mango milkshake|110|3.9|21|1.2|
میلک‌شیک انبه پروتئینی|Protein mango milkshake|106|8.5|13.6|2|
میلک‌شیک انبه با شیر بادام|Almond milk mango shake|96|1.2|17|2.5|
فراپه انبه|Mango frappe|124|1.4|24|2.5|
فراپه انبه با خامه|Mango frappe with whipped cream|156|1.4|24|6|
آیس بلندد انبه|Blended iced mango|115|1.2|23|2|
اسموتی انبه و شیر|Milk mango smoothie|114|3|21|2|
شیک انبه با بستنی|Mango ice cream shake|169|3.7|25|6|
یخ‌شکلات انبه|Iced chocolate with mango|110|3|19|2.5|
میلک‌شیک بلوبری|Blueberry milkshake|127|3.7|19|4|
میلک‌شیک بلوبری کم‌چرب|Low-fat blueberry milkshake|102|3.9|19|1.2|
میلک‌شیک بلوبری پروتئینی|Protein blueberry milkshake|101|8.5|12.2|2|
میلک‌شیک بلوبری با شیر بادام|Almond milk blueberry shake|88|1.2|15|2.5|
فراپه بلوبری|Blueberry frappe|116|1.4|22|2.5|
فراپه بلوبری با خامه|Blueberry frappe with whipped cream|148|1.4|22|6|
آیس بلندد بلوبری|Blended iced blueberry|107|1.2|21|2|
اسموتی بلوبری و شیر|Milk blueberry smoothie|106|3|19|2|
شیک بلوبری با بستنی|Blueberry ice cream shake|161|3.7|23|6|
یخ‌شکلات بلوبری|Iced chocolate with blueberry|102|3|17|2.5|
میلک‌شیک هلو کم‌چرب|Low-fat peach milkshake|102|3.9|19|1.2|
میلک‌شیک هلو پروتئینی|Protein peach milkshake|101|8.5|12.2|2|
میلک‌شیک هلو با شیر بادام|Almond milk peach shake|88|1.2|15|2.5|
فراپه هلو|Peach frappe|116|1.4|22|2.5|
فراپه هلو با خامه|Peach frappe with whipped cream|148|1.4|22|6|
آیس بلندد هلو|Blended iced peach|107|1.2|21|2|
اسموتی هلو و شیر|Milk peach smoothie|106|3|19|2|
شیک هلو با بستنی|Peach ice cream shake|161|3.7|23|6|
یخ‌شکلات هلو|Iced chocolate with peach|102|3|17|2.5|
میلک‌شیک فندق|Hazelnut milkshake|146|4.7|16|7|
میلک‌شیک فندق کم‌چرب|Low-fat hazelnut milkshake|105|4.9|16|2.4|
میلک‌شیک فندق پروتئینی|Protein hazelnut milkshake|110|9.5|10.1|3.5|
میلک‌شیک فندق با شیر بادام|Almond milk hazelnut shake|104|1.8|12|5.5|
فراپه فندق|Hazelnut frappe|133|1.9|19|5.5|
فراپه فندق با خامه|Hazelnut frappe with whipped cream|165|1.9|19|9|
آیس بلندد فندق|Blended iced hazelnut|123|1.6|18|5|
اسموتی فندق و شیر|Milk hazelnut smoothie|112|4|16|3.5|
شیک فندق با بستنی|Hazelnut ice cream shake|180|4.7|20|9|
یخ‌شکلات فندق|Iced chocolate with hazelnut|122|4|14|5.5|
میلک‌شیک نارگیل|Coconut milkshake|142|3.7|16|7|
میلک‌شیک نارگیل کم‌چرب|Low-fat coconut milkshake|101|3.9|16|2.4|
میلک‌شیک نارگیل پروتئینی|Protein coconut milkshake|106|8.5|10.1|3.5|
میلک‌شیک نارگیل با شیر بادام|Almond milk coconut shake|102|1.2|12|5.5|
فراپه نارگیل|Coconut frappe|131|1.4|19|5.5|
فراپه نارگیل با خامه|Coconut frappe with whipped cream|163|1.4|19|9|
آیس بلندد نارگیل|Blended iced coconut|122|1.2|18|5|
اسموتی نارگیل و شیر|Milk coconut smoothie|108|3|16|3.5|
شیک نارگیل با بستنی|Coconut ice cream shake|176|3.7|20|9|
یخ‌شکلات نارگیل|Iced chocolate with coconut|118|3|14|5.5|
میلک‌شیک خرما کم‌چرب|Low-fat date milkshake|128|4.4|25|1.2|
میلک‌شیک خرما پروتئینی|Protein date milkshake|120|9|16.4|2|
میلک‌شیک خرما با شیر بادام|Almond milk date shake|112|1.5|21|2.5|
فراپه خرما|Date frappe|141|1.7|28|2.5|
فراپه خرما با خامه|Date frappe with whipped cream|173|1.7|28|6|
آیس بلندد خرما|Blended iced date|132|1.4|27|2|
اسموتی خرما و شیر|Milk date smoothie|132|3.5|25|2|
شیک خرما با بستنی|Date ice cream shake|187|4.2|29|6|
یخ‌شکلات خرما|Iced chocolate with date|128|3.5|23|2.5|
میلک‌شیک کره بادام‌زمینی|Peanut butter milkshake|178|7.2|17|9|
میلک‌شیک کره بادام‌زمینی کم‌چرب|Low-fat peanut butter milkshake|126|7.4|17|3.2|
میلک‌شیک کره بادام‌زمینی پروتئینی|Protein peanut butter milkshake|132|12|10.8|4.5|
میلک‌شیک کره بادام‌زمینی با شیر بادام|Almond milk peanut butter shake|132|3|13|7.5|
فراپه کره بادام‌زمینی|Peanut butter frappe|160|3.2|20|7.5|
فراپه کره بادام‌زمینی با خامه|Peanut butter frappe with whipped cream|192|3.2|20|11|
آیس بلندد کره بادام‌زمینی|Blended iced peanut butter|149|2.6|19|7|
اسموتی کره بادام‌زمینی و شیر|Milk peanut butter smoothie|134|6.5|17|4.5|
شیک کره بادام‌زمینی با بستنی|Peanut butter ice cream shake|212|7.2|21|11|
یخ‌شکلات کره بادام‌زمینی|Iced chocolate with peanut butter|154|6.5|15|7.5|
میلک‌شیک کارامل نمکی|Salted caramel milkshake|140|3.7|20|5|
میلک‌شیک کارامل نمکی کم‌چرب|Low-fat salted caramel milkshake|110|3.9|20|1.6|
میلک‌شیک کارامل نمکی پروتئینی|Protein salted caramel milkshake|108|8.5|12.9|2.5|
میلک‌شیک کارامل نمکی با شیر بادام|Almond milk salted caramel shake|100|1.2|16|3.5|
فراپه کارامل نمکی|Salted caramel frappe|129|1.4|23|3.5|
فراپه کارامل نمکی با خامه|Salted caramel frappe with whipped cream|161|1.4|23|7|
آیس بلندد کارامل نمکی|Blended iced salted caramel|120|1.2|22|3|
اسموتی کارامل نمکی و شیر|Milk salted caramel smoothie|114|3|20|2.5|
شیک کارامل نمکی با بستنی|Salted caramel ice cream shake|174|3.7|24|7|
یخ‌شکلات کارامل نمکی|Iced chocolate with salted caramel|116|3|18|3.5|
میلک‌شیک شکلات سفید|White chocolate milkshake|147|4.2|19|6|
میلک‌شیک شکلات سفید کم‌چرب|Low-fat white chocolate milkshake|112|4.4|19|2|
میلک‌شیک شکلات سفید پروتئینی|Protein white chocolate milkshake|112|9|12.2|3|
میلک‌شیک شکلات سفید با شیر بادام|Almond milk white chocolate shake|106|1.5|15|4.5|
فراپه شکلات سفید|White chocolate frappe|135|1.7|22|4.5|
فراپه شکلات سفید با خامه|White chocolate frappe with whipped cream|167|1.7|22|8|
آیس بلندد شکلات سفید|Blended iced white chocolate|126|1.4|21|4|
اسموتی شکلات سفید و شیر|Milk white chocolate smoothie|117|3.5|19|3|
شیک شکلات سفید با بستنی|White chocolate ice cream shake|181|4.2|23|8|
یخ‌شکلات شکلات سفید|Iced chocolate with white chocolate|122|3.5|17|4.5|
میلک‌شیک تمشک|Raspberry milkshake|127|3.7|19|4|
میلک‌شیک تمشک کم‌چرب|Low-fat raspberry milkshake|102|3.9|19|1.2|
میلک‌شیک تمشک پروتئینی|Protein raspberry milkshake|101|8.5|12.2|2|
میلک‌شیک تمشک با شیر بادام|Almond milk raspberry shake|88|1.2|15|2.5|
فراپه تمشک|Raspberry frappe|116|1.4|22|2.5|
فراپه تمشک با خامه|Raspberry frappe with whipped cream|148|1.4|22|6|
آیس بلندد تمشک|Blended iced raspberry|107|1.2|21|2|
اسموتی تمشک و شیر|Milk raspberry smoothie|106|3|19|2|
شیک تمشک با بستنی|Raspberry ice cream shake|161|3.7|23|6|
یخ‌شکلات تمشک|Iced chocolate with raspberry|102|3|17|2.5|
میلک‌شیک آلبالو|Sour cherry milkshake|127|3.7|19|4|
میلک‌شیک آلبالو کم‌چرب|Low-fat sour cherry milkshake|102|3.9|19|1.2|
میلک‌شیک آلبالو پروتئینی|Protein sour cherry milkshake|101|8.5|12.2|2|
میلک‌شیک آلبالو با شیر بادام|Almond milk sour cherry shake|88|1.2|15|2.5|
فراپه آلبالو|Sour cherry frappe|116|1.4|22|2.5|
فراپه آلبالو با خامه|Sour cherry frappe with whipped cream|148|1.4|22|6|
آیس بلندد آلبالو|Blended iced sour cherry|107|1.2|21|2|
اسموتی آلبالو و شیر|Milk sour cherry smoothie|106|3|19|2|
شیک آلبالو با بستنی|Sour cherry ice cream shake|161|3.7|23|6|
یخ‌شکلات آلبالو|Iced chocolate with sour cherry|102|3|17|2.5|
میلک‌شیک زعفران|Saffron milkshake|113|3.2|16|4|
میلک‌شیک زعفران کم‌چرب|Low-fat saffron milkshake|88|3.4|16|1.2|
میلک‌شیک زعفران پروتئینی|Protein saffron milkshake|90|8|10.1|2|
میلک‌شیک زعفران با شیر بادام|Almond milk saffron shake|74|1|12|2.5|
فراپه زعفران|Saffron frappe|103|1.2|19|2.5|
فراپه زعفران با خامه|Saffron frappe with whipped cream|135|1.2|19|6|
آیس بلندد زعفران|Blended iced saffron|94|1|18|2|
اسموتی زعفران و شیر|Milk saffron smoothie|92|2.5|16|2|
شیک زعفران با بستنی|Saffron ice cream shake|147|3.2|20|6|
یخ‌شکلات زعفران|Iced chocolate with saffron|88|2.5|14|2.5|
میلک‌شیک دارچین|Cinnamon milkshake|113|3.2|16|4|
میلک‌شیک دارچین کم‌چرب|Low-fat cinnamon milkshake|88|3.4|16|1.2|
میلک‌شیک دارچین پروتئینی|Protein cinnamon milkshake|90|8|10.1|2|
میلک‌شیک دارچین با شیر بادام|Almond milk cinnamon shake|74|1|12|2.5|
فراپه دارچین|Cinnamon frappe|103|1.2|19|2.5|
فراپه دارچین با خامه|Cinnamon frappe with whipped cream|135|1.2|19|6|
آیس بلندد دارچین|Blended iced cinnamon|94|1|18|2|
اسموتی دارچین و شیر|Milk cinnamon smoothie|92|2.5|16|2|
شیک دارچین با بستنی|Cinnamon ice cream shake|147|3.2|20|6|
یخ‌شکلات دارچین|Iced chocolate with cinnamon|88|2.5|14|2.5|
میلک‌شیک عسل و بادام|Honey almond milkshake|159|5.2|21|6|
میلک‌شیک عسل و بادام کم‌چرب|Low-fat honey almond milkshake|124|5.4|21|2|
میلک‌شیک عسل و بادام پروتئینی|Protein honey almond milkshake|121|10|13.6|3|
میلک‌شیک عسل و بادام با شیر بادام|Almond milk honey almond shake|116|2|17|4.5|
فراپه عسل و بادام|Honey almond frappe|145|2.2|24|4.5|
فراپه عسل و بادام با خامه|Honey almond frappe with whipped cream|177|2.2|24|8|
آیس بلندد عسل و بادام|Blended iced honey almond|135|1.8|23|4|
اسموتی عسل و بادام و شیر|Milk honey almond smoothie|129|4.5|21|3|
شیک عسل و بادام با بستنی|Honey almond ice cream shake|193|5.2|25|8|
یخ‌شکلات عسل و بادام|Iced chocolate with honey almond|134|4.5|19|4.5|
میلک‌شیک ماچا|Matcha milkshake|129|4.2|18|4.5|
میلک‌شیک ماچا کم‌چرب|Low-fat matcha milkshake|102|4.4|18|1.4|
میلک‌شیک ماچا پروتئینی|Protein matcha milkshake|102|9|11.5|2.2|
میلک‌شیک ماچا با شیر بادام|Almond milk matcha shake|89|1.5|14|3|
فراپه ماچا|Matcha frappe|118|1.7|21|3|
فراپه ماچا با خامه|Matcha frappe with whipped cream|149|1.7|21|6.5|
آیس بلندد ماچا|Blended iced matcha|108|1.4|20|2.5|
اسموتی ماچا و شیر|Milk matcha smoothie|106|3.5|18|2.2|
شیک ماچا با بستنی|Matcha ice cream shake|163|4.2|22|6.5|
یخ‌شکلات ماچا|Iced chocolate with matcha|105|3.5|16|3|
میلک‌شیک تیرامیسو|Tiramisu milkshake|149|4.7|19|6|
میلک‌شیک تیرامیسو کم‌چرب|Low-fat tiramisu milkshake|114|4.9|19|2|
میلک‌شیک تیرامیسو پروتئینی|Protein tiramisu milkshake|114|9.5|12.2|3|
میلک‌شیک تیرامیسو با شیر بادام|Almond milk tiramisu shake|108|1.8|15|4.5|
فراپه تیرامیسو|Tiramisu frappe|136|1.9|22|4.5|
فراپه تیرامیسو با خامه|Tiramisu frappe with whipped cream|168|1.9|22|8|
آیس بلندد تیرامیسو|Blended iced tiramisu|126|1.6|21|4|
اسموتی تیرامیسو و شیر|Milk tiramisu smoothie|119|4|19|3|
شیک تیرامیسو با بستنی|Tiramisu ice cream shake|183|4.7|23|8|
یخ‌شکلات تیرامیسو|Iced chocolate with tiramisu|124|4|17|4.5|
میلک‌شیک چیزکیک|Cheesecake milkshake|157|4.7|20|6.5|
میلک‌شیک چیزکیک کم‌چرب|Low-fat cheesecake milkshake|119|4.9|20|2.2|
میلک‌شیک چیزکیک پروتئینی|Protein cheesecake milkshake|119|9.5|12.9|3.2|
میلک‌شیک چیزکیک با شیر بادام|Almond milk cheesecake shake|116|1.8|16|5|
فراپه چیزکیک|Cheesecake frappe|145|1.9|23|5|
فراپه چیزکیک با خامه|Cheesecake frappe with whipped cream|176|1.9|23|8.5|
آیس بلندد چیزکیک|Blended iced cheesecake|135|1.6|22|4.5|
اسموتی چیزکیک و شیر|Milk cheesecake smoothie|125|4|20|3.2|
شیک چیزکیک با بستنی|Cheesecake ice cream shake|191|4.7|24|8.5|
یخ‌شکلات چیزکیک|Iced chocolate with cheesecake|133|4|18|5|
میلک‌شیک کوکی و کرم|Cookies and cream milkshake|155|4.2|21|6|
میلک‌شیک کوکی و کرم کم‌چرب|Low-fat cookies and cream milkshake|120|4.4|21|2|
میلک‌شیک کوکی و کرم پروتئینی|Protein cookies and cream milkshake|117|9|13.6|3|
میلک‌شیک کوکی و کرم با شیر بادام|Almond milk cookies and cream shake|114|1.5|17|4.5|
فراپه کوکی و کرم|Cookies and cream frappe|143|1.7|24|4.5|
فراپه کوکی و کرم با خامه|Cookies and cream frappe with whipped cream|175|1.7|24|8|
آیس بلندد کوکی و کرم|Blended iced cookies and cream|134|1.4|23|4|
اسموتی کوکی و کرم و شیر|Milk cookies and cream smoothie|125|3.5|21|3|
شیک کوکی و کرم با بستنی|Cookies and cream ice cream shake|189|4.2|25|8|
یخ‌شکلات کوکی و کرم|Iced chocolate with cookies and cream|130|3.5|19|4.5|
میلک‌شیک کدو حلوایی|Pumpkin milkshake|137|4|19|5|
میلک‌شیک کدو حلوایی کم‌چرب|Low-fat pumpkin milkshake|107|4.2|19|1.6|
میلک‌شیک کدو حلوایی پروتئینی|Protein pumpkin milkshake|106|8.8|12.2|2.5|
میلک‌شیک کدو حلوایی با شیر بادام|Almond milk pumpkin shake|97|1.4|15|3.5|
فراپه کدو حلوایی|Pumpkin frappe|126|1.6|22|3.5|
فراپه کدو حلوایی با خامه|Pumpkin frappe with whipped cream|157|1.6|22|7|
آیس بلندد کدو حلوایی|Blended iced pumpkin|116|1.3|21|3|
اسموتی کدو حلوایی و شیر|Milk pumpkin smoothie|112|3.3|19|2.5|
شیک کدو حلوایی با بستنی|Pumpkin ice cream shake|171|4|23|7|
یخ‌شکلات کدو حلوایی|Iced chocolate with pumpkin|113|3.3|17|3.5|
میلک‌شیک بیسکویت|Biscuit milkshake|146|4.2|20|5.5|
میلک‌شیک بیسکویت کم‌چرب|Low-fat biscuit milkshake|114|4.4|20|1.8|
میلک‌شیک بیسکویت پروتئینی|Protein biscuit milkshake|112|9|12.9|2.8|
میلک‌شیک بیسکویت با شیر بادام|Almond milk biscuit shake|106|1.5|16|4|
فراپه بیسکویت|Biscuit frappe|135|1.7|23|4|
فراپه بیسکویت با خامه|Biscuit frappe with whipped cream|166|1.7|23|7.5|
آیس بلندد بیسکویت|Blended iced biscuit|125|1.4|22|3.5|
اسموتی بیسکویت و شیر|Milk biscuit smoothie|119|3.5|20|2.8|
شیک بیسکویت با بستنی|Biscuit ice cream shake|180|4.2|24|7.5|
یخ‌شکلات بیسکویت|Iced chocolate with biscuit|122|3.5|18|4|
اسموتی توت‌فرنگی|Strawberry smoothie|42|0.9|9|0.3|
اسموتی توت‌فرنگی با ماست|Yogurt strawberry smoothie|67|2.9|11|1.3|
اسموتی توت‌فرنگی با شیر بادام|Almond milk strawberry smoothie|44|1.1|8.1|0.7|
اسموتی کاسه‌ای توت‌فرنگی|Strawberry smoothie bowl|142|2.9|23|4.3|
اسموتی توت‌فرنگی با آب|Water-based strawberry smoothie|37|0.6|8.1|0.2|
آب‌میوه ترکیبی توت‌فرنگی|Blended strawberry juice|33|0.5|7.6|0.1|
اسموتی موز|Banana smoothie|87|1.1|20|0.3|
اسموتی موز با ماست|Yogurt banana smoothie|112|3.1|22|1.3|
اسموتی موز با شیر بادام|Almond milk banana smoothie|84|1.3|18|0.7|
اسموتی کاسه‌ای موز|Banana smoothie bowl|187|3.1|34|4.3|
اسموتی موز با آب|Water-based banana smoothie|77|0.8|18|0.2|
آب‌میوه ترکیبی موز|Blended banana juice|71|0.6|17|0.1|
اسموتی انبه با ماست|Yogurt mango smoothie|91|2.8|17|1.3|
اسموتی انبه با شیر بادام|Almond milk mango smoothie|65|1.1|13.5|0.7|
اسموتی کاسه‌ای انبه|Mango smoothie bowl|166|2.8|29|4.3|
اسموتی انبه با آب|Water-based mango smoothie|58|0.6|13.5|0.2|
آب‌میوه ترکیبی انبه|Blended mango juice|53|0.4|12.8|0.1|
اسموتی آناناس با ماست|Yogurt pineapple smoothie|80|2.5|15|1.1|
اسموتی آناناس با شیر بادام|Almond milk pineapple smoothie|55|0.8|11.7|0.6|
اسموتی کاسه‌ای آناناس|Pineapple smoothie bowl|155|2.5|27|4.1|
اسموتی آناناس با آب|Water-based pineapple smoothie|49|0.3|11.7|0.1|
آب‌میوه ترکیبی آناناس|Blended pineapple juice|45|0.2|11|0|
اسموتی هلو با ماست|Yogurt peach smoothie|70|2.8|12|1.2|
اسموتی هلو با شیر بادام|Almond milk peach smoothie|46|1.1|9|0.7|
اسموتی کاسه‌ای هلو|Peach smoothie bowl|145|2.8|24|4.2|
اسموتی هلو با آب|Water-based peach smoothie|39|0.6|9|0.1|
آب‌میوه ترکیبی هلو|Blended peach juice|36|0.4|8.5|0|
اسموتی بلوبری با ماست|Yogurt blueberry smoothie|78|2.7|14|1.3|
اسموتی بلوبری با شیر بادام|Almond milk blueberry smoothie|54|1|10.8|0.7|
اسموتی کاسه‌ای بلوبری|Blueberry smoothie bowl|154|2.7|26|4.3|
اسموتی بلوبری با آب|Water-based blueberry smoothie|47|0.5|10.8|0.2|
آب‌میوه ترکیبی بلوبری|Blended blueberry juice|43|0.3|10.2|0.1|
اسموتی تمشک|Raspberry smoothie|48|1|10|0.5|
اسموتی تمشک با ماست|Yogurt raspberry smoothie|74|3|12|1.5|
اسموتی تمشک با شیر بادام|Almond milk raspberry smoothie|49|1.2|9|0.9|
اسموتی کاسه‌ای تمشک|Raspberry smoothie bowl|148|3|24|4.5|
اسموتی تمشک با آب|Water-based raspberry smoothie|42|0.7|9|0.3|
آب‌میوه ترکیبی تمشک|Blended raspberry juice|37|0.5|8.5|0.1|
اسموتی آووکادو با ماست|Yogurt avocado smoothie|149|3.8|11|10|
اسموتی آووکادو با شیر بادام|Almond milk avocado smoothie|109|1.8|8.1|7.7|
اسموتی کاسه‌ای آووکادو|Avocado smoothie bowl|224|3.8|23|13|
اسموتی آووکادو با آب|Water-based avocado smoothie|86|1.3|8.1|5.4|
آب‌میوه ترکیبی آووکادو|Blended avocado juice|50|0.9|7.6|1.8|
اسموتی اسفناج و موز|Spinach banana smoothie|74|1.5|16|0.4|
اسموتی اسفناج و موز با ماست|Yogurt spinach banana smoothie|99|3.5|18|1.4|
اسموتی اسفناج و موز با شیر بادام|Almond milk spinach banana smoothie|71|1.5|14.4|0.8|
اسموتی کاسه‌ای اسفناج و موز|Spinach banana smoothie bowl|174|3.5|30|4.4|
اسموتی اسفناج و موز با آب|Water-based spinach banana smoothie|64|1|14.4|0.2|
آب‌میوه ترکیبی اسفناج و موز|Blended spinach banana juice|58|0.8|13.6|0.1|
اسموتی کیوی|Kiwi smoothie|54|0.9|12|0.3|
اسموتی کیوی با ماست|Yogurt kiwi smoothie|79|2.9|14|1.3|
اسموتی کیوی با شیر بادام|Almond milk kiwi smoothie|54|1.1|10.8|0.7|
اسموتی کاسه‌ای کیوی|Kiwi smoothie bowl|154|2.9|26|4.3|
اسموتی کیوی با آب|Water-based kiwi smoothie|47|0.6|10.8|0.2|
آب‌میوه ترکیبی کیوی|Blended kiwi juice|43|0.5|10.2|0.1|
اسموتی هندوانه|Watermelon smoothie|35|0.6|8|0.1|
اسموتی هندوانه با ماست|Yogurt watermelon smoothie|60|2.6|10|1.1|
اسموتی هندوانه با شیر بادام|Almond milk watermelon smoothie|38|0.9|7.2|0.6|
اسموتی کاسه‌ای هندوانه|Watermelon smoothie bowl|135|2.6|22|4.1|
اسموتی هندوانه با آب|Water-based watermelon smoothie|31|0.4|7.2|0.1|
آب‌میوه ترکیبی هندوانه|Blended watermelon juice|29|0.3|6.8|0|
اسموتی طالبی|Cantaloupe smoothie|37|0.8|8|0.2|
اسموتی طالبی با ماست|Yogurt cantaloupe smoothie|62|2.8|10|1.2|
اسموتی طالبی با شیر بادام|Almond milk cantaloupe smoothie|39|1.1|7.2|0.7|
اسموتی کاسه‌ای طالبی|Cantaloupe smoothie bowl|137|2.8|22|4.2|
اسموتی طالبی با آب|Water-based cantaloupe smoothie|32|0.6|7.2|0.1|
آب‌میوه ترکیبی طالبی|Blended cantaloupe juice|29|0.4|6.8|0|
اسموتی پرتقال و هویج با ماست|Yogurt orange carrot smoothie|70|2.9|12|1.2|
اسموتی پرتقال و هویج با شیر بادام|Almond milk orange carrot smoothie|46|1.1|9|0.7|
اسموتی کاسه‌ای پرتقال و هویج|Orange carrot smoothie bowl|145|2.9|24|4.2|
اسموتی پرتقال و هویج با آب|Water-based orange carrot smoothie|40|0.6|9|0.1|
آب‌میوه ترکیبی پرتقال و هویج|Blended orange carrot juice|36|0.5|8.5|0|
اسموتی سیب و دارچین|Apple cinnamon smoothie|55|0.4|13|0.2|
اسموتی سیب و دارچین با ماست|Yogurt apple cinnamon smoothie|80|2.4|15|1.2|
اسموتی سیب و دارچین با شیر بادام|Almond milk apple cinnamon smoothie|56|0.8|11.7|0.7|
اسموتی کاسه‌ای سیب و دارچین|Apple cinnamon smoothie bowl|155|2.4|27|4.2|
اسموتی سیب و دارچین با آب|Water-based apple cinnamon smoothie|49|0.3|11.7|0.1|
آب‌میوه ترکیبی سیب و دارچین|Blended apple cinnamon juice|45|0.2|11|0|
اسموتی انار|Pomegranate smoothie|57|0.6|13|0.3|
اسموتی انار با ماست|Yogurt pomegranate smoothie|82|2.6|15|1.3|
اسموتی انار با شیر بادام|Almond milk pomegranate smoothie|57|0.9|11.7|0.7|
اسموتی کاسه‌ای انار|Pomegranate smoothie bowl|157|2.6|27|4.3|
اسموتی انار با آب|Water-based pomegranate smoothie|50|0.4|11.7|0.2|
آب‌میوه ترکیبی انار|Blended pomegranate juice|46|0.3|11|0.1|
اسموتی توت مخلوط|Mixed berry smoothie|46|0.8|10|0.3|
اسموتی توت مخلوط با ماست|Yogurt mixed berry smoothie|71|2.8|12|1.3|
اسموتی توت مخلوط با شیر بادام|Almond milk mixed berry smoothie|47|1.1|9|0.7|
اسموتی کاسه‌ای توت مخلوط|Mixed berry smoothie bowl|146|2.8|24|4.3|
اسموتی توت مخلوط با آب|Water-based mixed berry smoothie|40|0.6|9|0.2|
آب‌میوه ترکیبی توت مخلوط|Blended mixed berry juice|36|0.4|8.5|0.1|
اسموتی پروتئینی موز|Banana protein smoothie|106|9|14|1.5|
اسموتی پروتئینی موز با ماست|Yogurt banana protein smoothie|130|11|16|2.5|
اسموتی پروتئینی موز با شیر بادام|Almond milk banana protein smoothie|93|6.8|12.6|1.7|
اسموتی کاسه‌ای پروتئینی موز|Banana protein smoothie bowl|206|11|28|5.5|
اسموتی پروتئینی موز با آب|Water-based banana protein smoothie|84|6.3|12.6|0.9|
آب‌میوه ترکیبی پروتئینی موز|Blended banana protein juice|68|4.5|11.9|0.3|
اسموتی پروتئینی شکلاتی|Chocolate protein smoothie|94|10|9|2|
اسموتی پروتئینی شکلاتی با ماست|Yogurt chocolate protein smoothie|119|12|11|3|
اسموتی پروتئینی شکلاتی با شیر بادام|Almond milk chocolate protein smoothie|81|7.5|8.1|2.1|
اسموتی کاسه‌ای پروتئینی شکلاتی|Chocolate protein smoothie bowl|194|12|23|6|
اسموتی پروتئینی شکلاتی با آب|Water-based chocolate protein smoothie|71|7|8.1|1.2|
آب‌میوه ترکیبی پروتئینی شکلاتی|Blended chocolate protein juice|54|5|7.6|0.4|
اسموتی نارگیل و آناناس|Pineapple coconut smoothie|86|0.7|14|3|
اسموتی نارگیل و آناناس با ماست|Yogurt pineapple coconut smoothie|111|2.7|16|4|
اسموتی نارگیل و آناناس با شیر بادام|Almond milk pineapple coconut smoothie|80|1|12.6|2.9|
اسموتی کاسه‌ای نارگیل و آناناس|Pineapple coconut smoothie bowl|186|2.7|28|7|
اسموتی نارگیل و آناناس با آب|Water-based pineapple coconut smoothie|69|0.5|12.6|1.8|
آب‌میوه ترکیبی نارگیل و آناناس|Blended pineapple coconut juice|54|0.3|11.9|0.6|
اسموتی کره بادام‌زمینی و موز|Peanut butter banana smoothie|120|4|17|4|
اسموتی کره بادام‌زمینی و موز با ماست|Yogurt peanut butter banana smoothie|145|6|19|5|
اسموتی کره بادام‌زمینی و موز با شیر بادام|Almond milk peanut butter banana smoothie|108|3.3|15.3|3.7|
اسموتی کاسه‌ای کره بادام‌زمینی و موز|Peanut butter banana smoothie bowl|220|6|31|8|
اسموتی کره بادام‌زمینی و موز با آب|Water-based peanut butter banana smoothie|94|2.8|15.3|2.4|
آب‌میوه ترکیبی کره بادام‌زمینی و موز|Blended peanut butter banana juice|73|2|14.4|0.8|
اسموتی جو دوسر و موز|Oat banana smoothie|91|2.5|18|1|
اسموتی جو دوسر و موز با ماست|Yogurt oat banana smoothie|116|4.5|20|2|
اسموتی جو دوسر و موز با شیر بادام|Almond milk oat banana smoothie|86|2.2|16.2|1.3|
اسموتی کاسه‌ای جو دوسر و موز|Oat banana smoothie bowl|191|4.5|32|5|
اسموتی جو دوسر و موز با آب|Water-based oat banana smoothie|77|1.8|16.2|0.6|
آب‌میوه ترکیبی جو دوسر و موز|Blended oat banana juice|68|1.2|15.3|0.2|
اسموتی خرما و شیر با ماست|Yogurt date milk smoothie|116|4.5|19|2.5|
اسموتی خرما و شیر با شیر بادام|Almond milk date milk smoothie|86|2.2|15.3|1.7|
اسموتی کاسه‌ای خرما و شیر|Date milk smoothie bowl|192|4.5|31|5.5|
اسموتی خرما و شیر با آب|Water-based date milk smoothie|76|1.8|15.3|0.9|
آب‌میوه ترکیبی خرما و شیر|Blended date milk juice|66|1.2|14.4|0.3|
اسموتی سبز با ماست|Yogurt green smoothie|70|3.2|11|1.5|
اسموتی سبز با شیر بادام|Almond milk green smoothie|46|1.3|8.1|0.9|
اسموتی کاسه‌ای سبز|Green smoothie bowl|145|3.2|23|4.5|
اسموتی سبز با آب|Water-based green smoothie|38|0.8|8.1|0.3|
آب‌میوه ترکیبی سبز|Blended green juice|34|0.6|7.6|0.1|
اسموتی کلم کرم|Kale smoothie|46|1.5|9|0.5|
اسموتی کلم کرم با ماست|Yogurt kale smoothie|72|3.5|11|1.5|
اسموتی کلم کرم با شیر بادام|Almond milk kale smoothie|47|1.5|8.1|0.9|
اسموتی کاسه‌ای کلم کرم|Kale smoothie bowl|146|3.5|23|4.5|
اسموتی کلم کرم با آب|Water-based kale smoothie|39|1|8.1|0.3|
آب‌میوه ترکیبی کلم کرم|Blended kale juice|34|0.8|7.6|0.1|
اسموتی گلابی با ماست|Yogurt pear smoothie|77|2.5|14|1.2|
اسموتی گلابی با شیر بادام|Almond milk pear smoothie|53|0.8|10.8|0.7|
اسموتی کاسه‌ای گلابی|Pear smoothie bowl|152|2.5|26|4.2|
اسموتی گلابی با آب|Water-based pear smoothie|46|0.3|10.8|0.1|
آب‌میوه ترکیبی گلابی|Blended pear juice|42|0.2|10.2|0|
اسموتی زردآلو|Apricot smoothie|45|0.7|10|0.2|
اسموتی زردآلو با ماست|Yogurt apricot smoothie|70|2.7|12|1.2|
اسموتی زردآلو با شیر بادام|Almond milk apricot smoothie|46|1|9|0.7|
اسموتی کاسه‌ای زردآلو|Apricot smoothie bowl|145|2.7|24|4.2|
اسموتی زردآلو با آب|Water-based apricot smoothie|39|0.5|9|0.1|
آب‌میوه ترکیبی زردآلو|Blended apricot juice|36|0.3|8.5|0|
اسموتی گیلاس با ماست|Yogurt cherry smoothie|78|2.8|14|1.2|
اسموتی گیلاس با شیر بادام|Almond milk cherry smoothie|53|1.1|10.8|0.7|
اسموتی کاسه‌ای گیلاس|Cherry smoothie bowl|153|2.8|26|4.2|
اسموتی گیلاس با آب|Water-based cherry smoothie|47|0.6|10.8|0.1|
آب‌میوه ترکیبی گیلاس|Blended cherry juice|43|0.4|10.2|0|
اسموتی لیمو و نعنا|Lemon mint smoothie|34|0.3|8|0.1|
اسموتی لیمو و نعنا با ماست|Yogurt lemon mint smoothie|59|2.3|10|1.1|
اسموتی لیمو و نعنا با شیر بادام|Almond milk lemon mint smoothie|37|0.7|7.2|0.6|
اسموتی کاسه‌ای لیمو و نعنا|Lemon mint smoothie bowl|134|2.3|22|4.1|
اسموتی لیمو و نعنا با آب|Water-based lemon mint smoothie|30|0.2|7.2|0.1|
آب‌میوه ترکیبی لیمو و نعنا|Blended lemon mint juice|28|0.1|6.8|0|
اسموتی زنجبیل و هویج|Ginger carrot smoothie|41|0.8|9|0.2|
اسموتی زنجبیل و هویج با ماست|Yogurt ginger carrot smoothie|66|2.8|11|1.2|
اسموتی زنجبیل و هویج با شیر بادام|Almond milk ginger carrot smoothie|43|1.1|8.1|0.7|
اسموتی کاسه‌ای زنجبیل و هویج|Ginger carrot smoothie bowl|141|2.8|23|4.2|
اسموتی زنجبیل و هویج با آب|Water-based ginger carrot smoothie|36|0.6|8.1|0.1|
آب‌میوه ترکیبی زنجبیل و هویج|Blended ginger carrot juice|33|0.4|7.6|0|
اسموتی چیا و توت|Chia berry smoothie|67|2.2|10|2|
اسموتی چیا و توت با ماست|Yogurt chia berry smoothie|92|4.2|12|3|
اسموتی چیا و توت با شیر بادام|Almond milk chia berry smoothie|63|2|9|2.1|
اسموتی کاسه‌ای چیا و توت|Chia berry smoothie bowl|167|4.2|24|6|
اسموتی چیا و توت با آب|Water-based chia berry smoothie|53|1.5|9|1.2|
آب‌میوه ترکیبی چیا و توت|Blended chia berry juice|42|1.1|8.5|0.4|
اسموتی کینوا و میوه|Quinoa fruit smoothie|73|2|14|1|
اسموتی کینوا و میوه با ماست|Yogurt quinoa fruit smoothie|98|4|16|2|
اسموتی کینوا و میوه با شیر بادام|Almond milk quinoa fruit smoothie|70|1.9|12.6|1.3|
اسموتی کاسه‌ای کینوا و میوه|Quinoa fruit smoothie bowl|173|4|28|5|
اسموتی کینوا و میوه با آب|Water-based quinoa fruit smoothie|61|1.4|12.6|0.6|
آب‌میوه ترکیبی کینوا و میوه|Blended quinoa fruit juice|53|1|11.9|0.2|
اسموتی ماست و میوه با ماست|Yogurt yogurt fruit smoothie|102|4.8|15|2.5|
اسموتی ماست و میوه با شیر بادام|Almond milk yogurt fruit smoothie|72|2.5|11.7|1.7|
اسموتی کاسه‌ای ماست و میوه|Yogurt fruit smoothie bowl|177|4.8|27|5.5|
اسموتی ماست و میوه با آب|Water-based yogurt fruit smoothie|63|2|11.7|0.9|
آب‌میوه ترکیبی ماست و میوه|Blended yogurt fruit juice|52|1.4|11|0.3|
اسموتی ماست و انبه|Yogurt mango smoothie|79|2.6|14|1.4|
اسموتی ماست و انبه با ماست|Yogurt yogurt mango smoothie|104|4.6|16|2.4|
اسموتی ماست و انبه با شیر بادام|Almond milk yogurt mango smoothie|74|2.3|12.6|1.6|
اسموتی کاسه‌ای ماست و انبه|Yogurt mango smoothie bowl|179|4.6|28|5.4|
اسموتی ماست و انبه با آب|Water-based yogurt mango smoothie|65|1.8|12.6|0.8|
آب‌میوه ترکیبی ماست و انبه|Blended yogurt mango juice|55|1.3|11.9|0.3|
اسموتی کدو و دارچین|Pumpkin cinnamon smoothie|50|1.5|10|0.5|
اسموتی کدو و دارچین با ماست|Yogurt pumpkin cinnamon smoothie|76|3.5|12|1.5|
اسموتی کدو و دارچین با شیر بادام|Almond milk pumpkin cinnamon smoothie|50|1.5|9|0.9|
اسموتی کاسه‌ای کدو و دارچین|Pumpkin cinnamon smoothie bowl|150|3.5|24|4.5|
اسموتی کدو و دارچین با آب|Water-based pumpkin cinnamon smoothie|43|1|9|0.3|
آب‌میوه ترکیبی کدو و دارچین|Blended pumpkin cinnamon juice|38|0.8|8.5|0.1|
اسموتی بیتروت و سیب|Beetroot apple smoothie|50|1|11|0.2|
اسموتی بیتروت و سیب با ماست|Yogurt beetroot apple smoothie|75|3|13|1.2|
اسموتی بیتروت و سیب با شیر بادام|Almond milk beetroot apple smoothie|50|1.2|9.9|0.7|
اسموتی کاسه‌ای بیتروت و سیب|Beetroot apple smoothie bowl|150|3|25|4.2|
اسموتی بیتروت و سیب با آب|Water-based beetroot apple smoothie|43|0.7|9.9|0.1|
آب‌میوه ترکیبی بیتروت و سیب|Blended beetroot apple juice|40|0.5|9.3|0|
اسموتی آلوئه‌ورا و انگور|Aloe grape smoothie|51|0.5|12|0.1|
اسموتی آلوئه‌ورا و انگور با ماست|Yogurt aloe grape smoothie|76|2.5|14|1.1|
اسموتی آلوئه‌ورا و انگور با شیر بادام|Almond milk aloe grape smoothie|52|0.8|10.8|0.6|
اسموتی کاسه‌ای آلوئه‌ورا و انگور|Aloe grape smoothie bowl|151|2.5|26|4.1|
اسموتی آلوئه‌ورا و انگور با آب|Water-based aloe grape smoothie|45|0.3|10.8|0.1|
آب‌میوه ترکیبی آلوئه‌ورا و انگور|Blended aloe grape juice|42|0.2|10.2|0|
اسموتی آب‌نارگیل و میوه|Coconut water fruit smoothie|44|0.5|10|0.2|
اسموتی آب‌نارگیل و میوه با ماست|Yogurt coconut water fruit smoothie|69|2.5|12|1.2|
اسموتی آب‌نارگیل و میوه با شیر بادام|Almond milk coconut water fruit smoothie|45|0.8|9|0.7|
اسموتی کاسه‌ای آب‌نارگیل و میوه|Coconut water fruit smoothie bowl|144|2.5|24|4.2|
اسموتی آب‌نارگیل و میوه با آب|Water-based coconut water fruit smoothie|38|0.3|9|0.1|
آب‌میوه ترکیبی آب‌نارگیل و میوه|Blended coconut water fruit juice|35|0.2|8.5|0|
اسموتی نارنگی|Mandarin smoothie|49|0.7|11|0.2|
اسموتی نارنگی با ماست|Yogurt mandarin smoothie|74|2.7|13|1.2|
اسموتی نارنگی با شیر بادام|Almond milk mandarin smoothie|50|1|9.9|0.7|
اسموتی کاسه‌ای نارنگی|Mandarin smoothie bowl|149|2.7|25|4.2|
اسموتی نارنگی با آب|Water-based mandarin smoothie|43|0.5|9.9|0.1|
آب‌میوه ترکیبی نارنگی|Blended mandarin juice|39|0.3|9.3|0|
اسموتی لیچی|Lychee smoothie|51|0.5|12|0.1|
اسموتی لیچی با ماست|Yogurt lychee smoothie|76|2.5|14|1.1|
اسموتی لیچی با شیر بادام|Almond milk lychee smoothie|52|0.8|10.8|0.6|
اسموتی کاسه‌ای لیچی|Lychee smoothie bowl|151|2.5|26|4.1|
اسموتی لیچی با آب|Water-based lychee smoothie|45|0.3|10.8|0.1|
آب‌میوه ترکیبی لیچی|Blended lychee juice|42|0.2|10.2|0|
اسموتی پاپایا|Papaya smoothie|44|0.6|10|0.2|
اسموتی پاپایا با ماست|Yogurt papaya smoothie|69|2.6|12|1.2|
اسموتی پاپایا با شیر بادام|Almond milk papaya smoothie|46|0.9|9|0.7|
اسموتی کاسه‌ای پاپایا|Papaya smoothie bowl|144|2.6|24|4.2|
اسموتی پاپایا با آب|Water-based papaya smoothie|39|0.4|9|0.1|
آب‌میوه ترکیبی پاپایا|Blended papaya juice|36|0.3|8.5|0|
چای سیاه شیرین|Black tea with sugar|17|0|4.2|0|
چای سیاه با عسل|Black tea with honey|21|0|5.2|0|
چای سیاه با شیر|Black tea with milk|15|0.7|1.7|0.6|
آیس تی چای سیاه|Iced black tea|19|0|4.7|0|
آیس تی چای سیاه هلو|Peach iced black tea|25|0|6.2|0|
آیس تی چای سیاه لیمو|Lemon iced black tea|25|0|6.2|0|
آیس تی چای سیاه توت‌فرنگی|Strawberry iced black tea|25|0|6.2|0|
آیس تی چای سیاه بدون شکر|Unsweetened iced black tea|1|0|0.2|0|
آیس تی چای سیاه انبه|Mango iced black tea|27|0|6.7|0|
آیس تی چای سیاه آلبالو|Cherry iced black tea|25|0|6.2|0|
چای سبز شیرین|Green tea with sugar|16|0|4|0|
چای سبز با شیر|Green tea with milk|14|0.7|1.5|0.6|
آیس تی چای سبز|Iced green tea|18|0|4.5|0|
آیس تی چای سبز هلو|Peach iced green tea|24|0|6|0|
آیس تی چای سبز لیمو|Lemon iced green tea|24|0|6|0|
آیس تی چای سبز توت‌فرنگی|Strawberry iced green tea|24|0|6|0|
آیس تی چای سبز بدون شکر|Unsweetened iced green tea|1|0|0|0|
آیس تی چای سبز انبه|Mango iced green tea|26|0|6.5|0|
آیس تی چای سبز آلبالو|Cherry iced green tea|24|0|6|0|
چای سفید شیرین|White tea with sugar|16|0|4|0|
چای سفید با عسل|White tea with honey|20|0|5|0|
چای سفید با شیر|White tea with milk|14|0.7|1.5|0.6|
آیس تی چای سفید|Iced white tea|18|0|4.5|0|
آیس تی چای سفید هلو|Peach iced white tea|24|0|6|0|
آیس تی چای سفید لیمو|Lemon iced white tea|24|0|6|0|
آیس تی چای سفید توت‌فرنگی|Strawberry iced white tea|24|0|6|0|
آیس تی چای سفید بدون شکر|Unsweetened iced white tea|1|0|0|0|
آیس تی چای سفید انبه|Mango iced white tea|26|0|6.5|0|
آیس تی چای سفید آلبالو|Cherry iced white tea|24|0|6|0|
چای ماسالا شیرین|Masala tea with sugar|30|0.5|6|0.5|
چای ماسالا با عسل|Masala tea with honey|34|0.5|7|0.5|
چای ماسالا با شیر|Masala tea with milk|29|1.2|3.5|1.1|
آیس تی چای ماسالا|Iced masala tea|32|0.5|6.5|0.5|
آیس تی چای ماسالا هلو|Peach iced masala tea|38|0.5|8|0.5|
آیس تی چای ماسالا لیمو|Lemon iced masala tea|38|0.5|8|0.5|
آیس تی چای ماسالا توت‌فرنگی|Strawberry iced masala tea|38|0.5|8|0.5|
آیس تی چای ماسالا بدون شکر|Unsweetened iced masala tea|14|0.5|2|0.5|
آیس تی چای ماسالا انبه|Mango iced masala tea|40|0.5|8.5|0.5|
آیس تی چای ماسالا آلبالو|Cherry iced masala tea|38|0.5|8|0.5|
چای ترش شیرین|Hibiscus tea with sugar|17|0|4.3|0|
چای ترش با عسل|Hibiscus tea with honey|21|0|5.3|0|
چای ترش با شیر|Hibiscus tea with milk|15|0.7|1.8|0.6|
آیس تی چای ترش|Iced hibiscus tea|19|0|4.8|0|
آیس تی چای ترش هلو|Peach iced hibiscus tea|25|0|6.3|0|
آیس تی چای ترش لیمو|Lemon iced hibiscus tea|25|0|6.3|0|
آیس تی چای ترش توت‌فرنگی|Strawberry iced hibiscus tea|25|0|6.3|0|
آیس تی چای ترش بدون شکر|Unsweetened iced hibiscus tea|1|0|0.3|0|
آیس تی چای ترش انبه|Mango iced hibiscus tea|27|0|6.8|0|
آیس تی چای ترش آلبالو|Cherry iced hibiscus tea|25|0|6.3|0|
چای نعنا شیرین|Mint tea with sugar|16|0|4|0|
چای نعنا با عسل|Mint tea with honey|20|0|5|0|
چای نعنا با شیر|Mint tea with milk|14|0.7|1.5|0.6|
آیس تی چای نعنا|Iced mint tea|18|0|4.5|0|
آیس تی چای نعنا هلو|Peach iced mint tea|24|0|6|0|
آیس تی چای نعنا لیمو|Lemon iced mint tea|24|0|6|0|
آیس تی چای نعنا توت‌فرنگی|Strawberry iced mint tea|24|0|6|0|
آیس تی چای نعنا بدون شکر|Unsweetened iced mint tea|1|0|0|0|
آیس تی چای نعنا انبه|Mango iced mint tea|26|0|6.5|0|
آیس تی چای نعنا آلبالو|Cherry iced mint tea|24|0|6|0|
چای گل‌گاوزبان شیرین|Borage tea with sugar|16|0|4|0|
چای گل‌گاوزبان با عسل|Borage tea with honey|20|0|5|0|
چای گل‌گاوزبان با شیر|Borage tea with milk|14|0.7|1.5|0.6|
آیس تی چای گل‌گاوزبان|Iced borage tea|18|0|4.5|0|
آیس تی چای گل‌گاوزبان هلو|Peach iced borage tea|24|0|6|0|
آیس تی چای گل‌گاوزبان لیمو|Lemon iced borage tea|24|0|6|0|
آیس تی چای گل‌گاوزبان توت‌فرنگی|Strawberry iced borage tea|24|0|6|0|
آیس تی چای گل‌گاوزبان بدون شکر|Unsweetened iced borage tea|1|0|0|0|
آیس تی چای گل‌گاوزبان انبه|Mango iced borage tea|26|0|6.5|0|
آیس تی چای گل‌گاوزبان آلبالو|Cherry iced borage tea|24|0|6|0|
چای بهارنارنج شیرین|Orange blossom tea with sugar|16|0|4|0|
چای بهارنارنج با عسل|Orange blossom tea with honey|20|0|5|0|
چای بهارنارنج با شیر|Orange blossom tea with milk|14|0.7|1.5|0.6|
آیس تی چای بهارنارنج|Iced orange blossom tea|18|0|4.5|0|
آیس تی چای بهارنارنج هلو|Peach iced orange blossom tea|24|0|6|0|
آیس تی چای بهارنارنج لیمو|Lemon iced orange blossom tea|24|0|6|0|
آیس تی چای بهارنارنج توت‌فرنگی|Strawberry iced orange blossom tea|24|0|6|0|
آیس تی چای بهارنارنج بدون شکر|Unsweetened iced orange blossom tea|1|0|0|0|
آیس تی چای بهارنارنج انبه|Mango iced orange blossom tea|26|0|6.5|0|
آیس تی چای بهارنارنج آلبالو|Cherry iced orange blossom tea|24|0|6|0|
چای دارچین شیرین|Cinnamon tea with sugar|17|0|4.2|0|
چای دارچین با عسل|Cinnamon tea with honey|21|0|5.2|0|
چای دارچین با شیر|Cinnamon tea with milk|15|0.7|1.7|0.6|
آیس تی چای دارچین|Iced cinnamon tea|19|0|4.7|0|
آیس تی چای دارچین هلو|Peach iced cinnamon tea|25|0|6.2|0|
آیس تی چای دارچین لیمو|Lemon iced cinnamon tea|25|0|6.2|0|
آیس تی چای دارچین توت‌فرنگی|Strawberry iced cinnamon tea|25|0|6.2|0|
آیس تی چای دارچین بدون شکر|Unsweetened iced cinnamon tea|1|0|0.2|0|
آیس تی چای دارچین انبه|Mango iced cinnamon tea|27|0|6.7|0|
آیس تی چای دارچین آلبالو|Cherry iced cinnamon tea|25|0|6.2|0|
چای زنجبیل شیرین|Ginger tea with sugar|18|0|4.5|0|
چای زنجبیل با عسل|Ginger tea with honey|22|0|5.5|0|
چای زنجبیل با شیر|Ginger tea with milk|16|0.7|2|0.6|
آیس تی چای زنجبیل|Iced ginger tea|20|0|5|0|
آیس تی چای زنجبیل هلو|Peach iced ginger tea|26|0|6.5|0|
آیس تی چای زنجبیل لیمو|Lemon iced ginger tea|26|0|6.5|0|
آیس تی چای زنجبیل توت‌فرنگی|Strawberry iced ginger tea|26|0|6.5|0|
آیس تی چای زنجبیل بدون شکر|Unsweetened iced ginger tea|2|0|0.5|0|
آیس تی چای زنجبیل انبه|Mango iced ginger tea|28|0|7|0|
آیس تی چای زنجبیل آلبالو|Cherry iced ginger tea|26|0|6.5|0|
چای لیمو شیرین|Lemon tea with sugar|20|0|5|0|
چای لیمو با عسل|Lemon tea with honey|24|0|6|0|
چای لیمو با شیر|Lemon tea with milk|18|0.7|2.5|0.6|
آیس تی چای لیمو|Iced lemon tea|22|0|5.5|0|
آیس تی چای لیمو هلو|Peach iced lemon tea|28|0|7|0|
آیس تی چای لیمو لیمو|Lemon iced lemon tea|28|0|7|0|
آیس تی چای لیمو توت‌فرنگی|Strawberry iced lemon tea|28|0|7|0|
آیس تی چای لیمو بدون شکر|Unsweetened iced lemon tea|4|0|1|0|
آیس تی چای لیمو انبه|Mango iced lemon tea|30|0|7.5|0|
آیس تی چای لیمو آلبالو|Cherry iced lemon tea|28|0|7|0|
چای هل شیرین|Cardamom tea with sugar|17|0|4.2|0|
چای هل با عسل|Cardamom tea with honey|21|0|5.2|0|
چای هل با شیر|Cardamom tea with milk|15|0.7|1.7|0.6|
آیس تی چای هل|Iced cardamom tea|19|0|4.7|0|
آیس تی چای هل هلو|Peach iced cardamom tea|25|0|6.2|0|
آیس تی چای هل لیمو|Lemon iced cardamom tea|25|0|6.2|0|
آیس تی چای هل توت‌فرنگی|Strawberry iced cardamom tea|25|0|6.2|0|
آیس تی چای هل بدون شکر|Unsweetened iced cardamom tea|1|0|0.2|0|
آیس تی چای هل انبه|Mango iced cardamom tea|27|0|6.7|0|
آیس تی چای هل آلبالو|Cherry iced cardamom tea|25|0|6.2|0|
چای زعفران شیرین|Saffron tea with sugar|17|0|4.2|0|
چای زعفران با عسل|Saffron tea with honey|21|0|5.2|0|
چای زعفران با شیر|Saffron tea with milk|15|0.7|1.7|0.6|
آیس تی چای زعفران|Iced saffron tea|19|0|4.7|0|
آیس تی چای زعفران هلو|Peach iced saffron tea|25|0|6.2|0|
آیس تی چای زعفران لیمو|Lemon iced saffron tea|25|0|6.2|0|
آیس تی چای زعفران توت‌فرنگی|Strawberry iced saffron tea|25|0|6.2|0|
آیس تی چای زعفران بدون شکر|Unsweetened iced saffron tea|1|0|0.2|0|
آیس تی چای زعفران انبه|Mango iced saffron tea|27|0|6.7|0|
آیس تی چای زعفران آلبالو|Cherry iced saffron tea|25|0|6.2|0|
چای بابونه شیرین|Chamomile tea with sugar|16|0|4|0|
چای بابونه با عسل|Chamomile tea with honey|20|0|5|0|
چای بابونه با شیر|Chamomile tea with milk|14|0.7|1.5|0.6|
آیس تی چای بابونه|Iced chamomile tea|18|0|4.5|0|
آیس تی چای بابونه هلو|Peach iced chamomile tea|24|0|6|0|
آیس تی چای بابونه لیمو|Lemon iced chamomile tea|24|0|6|0|
آیس تی چای بابونه توت‌فرنگی|Strawberry iced chamomile tea|24|0|6|0|
آیس تی چای بابونه بدون شکر|Unsweetened iced chamomile tea|1|0|0|0|
آیس تی چای بابونه انبه|Mango iced chamomile tea|26|0|6.5|0|
آیس تی چای بابونه آلبالو|Cherry iced chamomile tea|24|0|6|0|
چای ارل گری شیرین|Earl Grey tea with sugar|16|0|4.1|0|
چای ارل گری با عسل|Earl Grey tea with honey|20|0|5.1|0|
چای ارل گری با شیر|Earl Grey tea with milk|15|0.7|1.6|0.6|
آیس تی چای ارل گری|Iced Earl Grey tea|18|0|4.6|0|
آیس تی چای ارل گری هلو|Peach iced Earl Grey tea|24|0|6.1|0|
آیس تی چای ارل گری لیمو|Lemon iced Earl Grey tea|24|0|6.1|0|
آیس تی چای ارل گری توت‌فرنگی|Strawberry iced Earl Grey tea|24|0|6.1|0|
آیس تی چای ارل گری بدون شکر|Unsweetened iced Earl Grey tea|1|0|0.1|0|
آیس تی چای ارل گری انبه|Mango iced Earl Grey tea|26|0|6.6|0|
آیس تی چای ارل گری آلبالو|Cherry iced Earl Grey tea|24|0|6.1|0|
چای ژاسمین شیرین|Jasmine tea with sugar|16|0|4|0|
چای ژاسمین با عسل|Jasmine tea with honey|20|0|5|0|
چای ژاسمین با شیر|Jasmine tea with milk|14|0.7|1.5|0.6|
آیس تی چای ژاسمین|Iced jasmine tea|18|0|4.5|0|
آیس تی چای ژاسمین هلو|Peach iced jasmine tea|24|0|6|0|
آیس تی چای ژاسمین لیمو|Lemon iced jasmine tea|24|0|6|0|
آیس تی چای ژاسمین توت‌فرنگی|Strawberry iced jasmine tea|24|0|6|0|
آیس تی چای ژاسمین بدون شکر|Unsweetened iced jasmine tea|1|0|0|0|
آیس تی چای ژاسمین انبه|Mango iced jasmine tea|26|0|6.5|0|
آیس تی چای ژاسمین آلبالو|Cherry iced jasmine tea|24|0|6|0|
چای ماچا شیرین|Matcha tea with sugar|19|0.5|4.3|0|
چای ماچا با عسل|Matcha tea with honey|23|0.5|5.3|0|
چای ماچا با شیر|Matcha tea with milk|17|1.2|1.8|0.6|
آیس تی چای ماچا|Iced matcha tea|21|0.5|4.8|0|
آیس تی چای ماچا هلو|Peach iced matcha tea|27|0.5|6.3|0|
آیس تی چای ماچا لیمو|Lemon iced matcha tea|27|0.5|6.3|0|
آیس تی چای ماچا توت‌فرنگی|Strawberry iced matcha tea|27|0.5|6.3|0|
آیس تی چای ماچا بدون شکر|Unsweetened iced matcha tea|3|0.5|0.3|0|
آیس تی چای ماچا انبه|Mango iced matcha tea|29|0.5|6.8|0|
آیس تی چای ماچا آلبالو|Cherry iced matcha tea|27|0.5|6.3|0|
چای تایلندی|Thai tea|72|1.5|12|2|
چای حبابی|Bubble tea|78|1|14|2|
چای حبابی توت‌فرنگی|Strawberry bubble tea|78|1|15|1.5|
چای حبابی شیری|Milk bubble tea|84|1.5|14|2.5|
چای حبابی تارو|Taro bubble tea|83|1.2|15|2|
چای حبابی انبه|Mango bubble tea|76|0.8|16|1|
چای حبابی شکلاتی|Chocolate bubble tea|84|1.5|15|2|
چای حبابی ماچا|Matcha bubble tea|80|1.5|14|2|
چای حبابی هلو|Peach bubble tea|72|0.8|15|1|
چای حبابی قهوه|Coffee bubble tea|83|1.2|15|2|
چای حبابی عسل|Honey bubble tea|82|1|16|1.5|
چای حبابی لیمو|Lemon bubble tea|62|0.5|14|0.5|
چای حبابی کارامل|Caramel bubble tea|87|1.2|16|2|
چای حبابی نارگیل|Coconut bubble tea|87|1|14|3|
چای حبابی پسته|Pistachio bubble tea|84|1.5|14|2.5|
چای حبابی زعفران|Saffron bubble tea|78|1|14|2|
چای حبابی خرما|Date bubble tea|82|1.2|16|1.5|
چای لاته ماسالا|Masala chai latte|71|2.5|9|2.8|
چای لاته وانیلی|Vanilla chai latte|76|2.5|11|2.5|
چای لاته دارچینی|Cinnamon chai latte|72|2.5|10|2.5|
چای لاته کارامل|Caramel chai latte|80|2.5|12|2.5|
چای لاته شیرین|Sweet chai latte|84|2.5|13|2.5|
چای لاته زعفرانی|Saffron chai latte|70|2.5|9|2.7|
چای لاته یخ|Iced chai latte|62|2|9|2|
چای لاته ماچا یخ|Iced matcha latte|54|2|7|2|
چای لاته ماچا با شیر جو دوسر|Oat milk matcha latte|54|1|9|1.5|
چای لاته ماچا با شیر بادام|Almond milk matcha latte|37|0.8|5|1.5|
چای لاته ماچا با شیر نارگیل|Coconut milk matcha latte|46|1|6|2|
چای لاته ماچا شیرین|Sweet matcha latte|69|2.2|10|2.2|
چای لاته ارل گری|Earl Grey latte London Fog|65|2.4|8|2.6|
چای لاته چای سبز|Green tea latte|58|2|8|2|
چای لاته چای سبز یخ|Iced green tea latte|51|1.8|7|1.8|
چای لاته بابونه|Chamomile latte|64|2.5|8|2.5|
چای لاته توت‌فرنگی|Strawberry latte|69|2.4|10|2.2|
شربت آلبالو غلیظ|Concentrated sour cherry sharbat|195|0.8|48|0|
شربت آلبالو یخ|Iced sour cherry sharbat|49|0.2|12|0|
شربت آلبالو با یخ و سودا|Sparkling iced sour cherry sharbat|34|0.1|8.4|0|
شربت آلبالو کم‌شیرین|Light sour cherry sharbat|27|0.2|6.6|0|
شربت آلبالو با شیر|Milky sour cherry sharbat|77|1.7|14.2|1.5|
شربت آلبالو بدون شکر|Sugar-free sour cherry sharbat|7|0.2|1.4|0|
شربت به‌لیمو|Lime sharbat|44|0.1|11|0|
شربت به‌لیمو غلیظ|Concentrated lime sharbat|178|0.4|44|0|
شربت به‌لیمو یخ|Iced lime sharbat|44|0.1|11|0|
شربت به‌لیمو با یخ و سودا|Sparkling iced lime sharbat|31|0.1|7.7|0|
شربت به‌لیمو کم‌شیرین|Light lime sharbat|25|0.1|6.1|0|
شربت به‌لیمو با شیر|Milky lime sharbat|73|1.6|13.2|1.5|
شربت به‌لیمو بدون شکر|Sugar-free lime sharbat|6|0.1|1.3|0|
شربت سکنجبین غلیظ|Concentrated sekanjabin|226|0.4|56|0|
شربت سکنجبین یخ|Iced sekanjabin|56|0.1|14|0|
شربت سکنجبین با یخ و سودا|Sparkling iced sekanjabin|39|0.1|9.8|0|
شربت سکنجبین کم‌شیرین|Light sekanjabin|31|0.1|7.7|0|
شربت سکنجبین با شیر|Milky sekanjabin|85|1.6|16.2|1.5|
شربت سکنجبین بدون شکر|Sugar-free sekanjabin|7|0.1|1.7|0|
شربت بهارنارنج|Orange blossom sharbat|44|0.1|11|0|
شربت بهارنارنج غلیظ|Concentrated orange blossom sharbat|178|0.4|44|0|
شربت بهارنارنج یخ|Iced orange blossom sharbat|44|0.1|11|0|
شربت بهارنارنج با یخ و سودا|Sparkling iced orange blossom sharbat|31|0.1|7.7|0|
شربت بهارنارنج کم‌شیرین|Light orange blossom sharbat|25|0.1|6.1|0|
شربت بهارنارنج با شیر|Milky orange blossom sharbat|73|1.6|13.2|1.5|
شربت بهارنارنج بدون شکر|Sugar-free orange blossom sharbat|6|0.1|1.3|0|
شربت زعفران غلیظ|Concentrated saffron sharbat|194|0.4|48|0|
شربت زعفران یخ|Iced saffron sharbat|48|0.1|12|0|
شربت زعفران با یخ و سودا|Sparkling iced saffron sharbat|34|0.1|8.4|0|
شربت زعفران کم‌شیرین|Light saffron sharbat|27|0.1|6.6|0|
شربت زعفران با شیر|Milky saffron sharbat|77|1.6|14.2|1.5|
شربت زعفران بدون شکر|Sugar-free saffron sharbat|6|0.1|1.4|0|
شربت گلاب|Rosewater sharbat|44|0.1|11|0|
شربت گلاب غلیظ|Concentrated rosewater sharbat|178|0.4|44|0|
شربت گلاب یخ|Iced rosewater sharbat|44|0.1|11|0|
شربت گلاب با یخ و سودا|Sparkling iced rosewater sharbat|31|0.1|7.7|0|
شربت گلاب کم‌شیرین|Light rosewater sharbat|25|0.1|6.1|0|
شربت گلاب با شیر|Milky rosewater sharbat|73|1.6|13.2|1.5|
شربت گلاب بدون شکر|Sugar-free rosewater sharbat|6|0.1|1.3|0|
شربت خاکشیر غلیظ|Concentrated khakshir sharbat|211|2|48|1.2|
شربت خاکشیر یخ|Iced khakshir sharbat|53|0.5|12|0.3|
شربت خاکشیر با یخ و سودا|Sparkling iced khakshir sharbat|37|0.3|8.4|0.2|
شربت خاکشیر کم‌شیرین|Light khakshir sharbat|31|0.5|6.6|0.3|
شربت خاکشیر با شیر|Milky khakshir sharbat|81|2|14.2|1.8|
شربت خاکشیر بدون شکر|Sugar-free khakshir sharbat|10|0.5|1.4|0.3|
شربت تخم شربتی غلیظ|Concentrated basil seed sharbat|216|2.4|48|1.6|
شربت تخم شربتی یخ|Iced basil seed sharbat|54|0.6|12|0.4|
شربت تخم شربتی با یخ و سودا|Sparkling iced basil seed sharbat|38|0.4|8.4|0.3|
شربت تخم شربتی کم‌شیرین|Light basil seed sharbat|32|0.6|6.6|0.4|
شربت تخم شربتی با شیر|Milky basil seed sharbat|82|2.1|14.2|1.9|
شربت تخم شربتی بدون شکر|Sugar-free basil seed sharbat|12|0.6|1.4|0.4|
شربت تمر هندی غلیظ|Concentrated tamarind sharbat|229|1.2|56|0|
شربت تمر هندی یخ|Iced tamarind sharbat|57|0.3|14|0|
شربت تمر هندی با یخ و سودا|Sparkling iced tamarind sharbat|40|0.2|9.8|0|
شربت تمر هندی کم‌شیرین|Light tamarind sharbat|32|0.3|7.7|0|
شربت تمر هندی با شیر|Milky tamarind sharbat|86|1.8|16.2|1.5|
شربت تمر هندی بدون شکر|Sugar-free tamarind sharbat|8|0.3|1.7|0|
شربت عسل و لیمو|Honey lemon sharbat|44|0.1|11|0|
شربت عسل و لیمو غلیظ|Concentrated honey lemon sharbat|178|0.4|44|0|
شربت عسل و لیمو یخ|Iced honey lemon sharbat|44|0.1|11|0|
شربت عسل و لیمو با یخ و سودا|Sparkling iced honey lemon sharbat|31|0.1|7.7|0|
شربت عسل و لیمو کم‌شیرین|Light honey lemon sharbat|25|0.1|6.1|0|
شربت عسل و لیمو با شیر|Milky honey lemon sharbat|73|1.6|13.2|1.5|
شربت عسل و لیمو بدون شکر|Sugar-free honey lemon sharbat|6|0.1|1.3|0|
شربت انار غلیظ|Concentrated pomegranate sharbat|211|0.8|52|0|
شربت انار یخ|Iced pomegranate sharbat|53|0.2|13|0|
شربت انار با یخ و سودا|Sparkling iced pomegranate sharbat|37|0.1|9.1|0|
شربت انار کم‌شیرین|Light pomegranate sharbat|29|0.2|7.2|0|
شربت انار با شیر|Milky pomegranate sharbat|81|1.7|15.2|1.5|
شربت انار بدون شکر|Sugar-free pomegranate sharbat|7|0.2|1.6|0|
شربت سیب|Apple sharbat|49|0.2|12|0|
شربت سیب غلیظ|Concentrated apple sharbat|195|0.8|48|0|
شربت سیب یخ|Iced apple sharbat|49|0.2|12|0|
شربت سیب با یخ و سودا|Sparkling iced apple sharbat|34|0.1|8.4|0|
شربت سیب کم‌شیرین|Light apple sharbat|27|0.2|6.6|0|
شربت سیب با شیر|Milky apple sharbat|77|1.7|14.2|1.5|
شربت سیب بدون شکر|Sugar-free apple sharbat|7|0.2|1.4|0|
شربت بیدمشک|Willow sharbat|44|0.1|11|0|
شربت بیدمشک غلیظ|Concentrated willow sharbat|178|0.4|44|0|
شربت بیدمشک یخ|Iced willow sharbat|44|0.1|11|0|
شربت بیدمشک با یخ و سودا|Sparkling iced willow sharbat|31|0.1|7.7|0|
شربت بیدمشک کم‌شیرین|Light willow sharbat|25|0.1|6.1|0|
شربت بیدمشک با شیر|Milky willow sharbat|73|1.6|13.2|1.5|
شربت بیدمشک بدون شکر|Sugar-free willow sharbat|6|0.1|1.3|0|
شربت نعنا|Mint sharbat|44|0.1|11|0|
شربت نعنا غلیظ|Concentrated mint sharbat|178|0.4|44|0|
شربت نعنا یخ|Iced mint sharbat|44|0.1|11|0|
شربت نعنا با یخ و سودا|Sparkling iced mint sharbat|31|0.1|7.7|0|
شربت نعنا کم‌شیرین|Light mint sharbat|25|0.1|6.1|0|
شربت نعنا با شیر|Milky mint sharbat|73|1.6|13.2|1.5|
شربت نعنا بدون شکر|Sugar-free mint sharbat|6|0.1|1.3|0|
شربت ریواس|Rhubarb sharbat|45|0.2|11|0|
شربت ریواس غلیظ|Concentrated rhubarb sharbat|179|0.8|44|0|
شربت ریواس یخ|Iced rhubarb sharbat|45|0.2|11|0|
شربت ریواس با یخ و سودا|Sparkling iced rhubarb sharbat|31|0.1|7.7|0|
شربت ریواس کم‌شیرین|Light rhubarb sharbat|25|0.2|6.1|0|
شربت ریواس با شیر|Milky rhubarb sharbat|73|1.7|13.2|1.5|
شربت ریواس بدون شکر|Sugar-free rhubarb sharbat|6|0.2|1.3|0|
شربت توت‌فرنگی|Strawberry sharbat|49|0.2|12|0|
شربت توت‌فرنگی غلیظ|Concentrated strawberry sharbat|195|0.8|48|0|
شربت توت‌فرنگی یخ|Iced strawberry sharbat|49|0.2|12|0|
شربت توت‌فرنگی با یخ و سودا|Sparkling iced strawberry sharbat|34|0.1|8.4|0|
شربت توت‌فرنگی کم‌شیرین|Light strawberry sharbat|27|0.2|6.6|0|
شربت توت‌فرنگی با شیر|Milky strawberry sharbat|77|1.7|14.2|1.5|
شربت توت‌فرنگی بدون شکر|Sugar-free strawberry sharbat|7|0.2|1.4|0|
شربت پرتقال|Orange sharbat|49|0.2|12|0|
شربت پرتقال غلیظ|Concentrated orange sharbat|195|0.8|48|0|
شربت پرتقال یخ|Iced orange sharbat|49|0.2|12|0|
شربت پرتقال با یخ و سودا|Sparkling iced orange sharbat|34|0.1|8.4|0|
شربت پرتقال کم‌شیرین|Light orange sharbat|27|0.2|6.6|0|
شربت پرتقال با شیر|Milky orange sharbat|77|1.7|14.2|1.5|
شربت پرتقال بدون شکر|Sugar-free orange sharbat|7|0.2|1.4|0|
شربت لیمو شیرین|Sweet lime sharbat|45|0.2|11|0|
شربت لیمو شیرین غلیظ|Concentrated sweet lime sharbat|179|0.8|44|0|
شربت لیمو شیرین یخ|Iced sweet lime sharbat|45|0.2|11|0|
شربت لیمو شیرین با یخ و سودا|Sparkling iced sweet lime sharbat|31|0.1|7.7|0|
شربت لیمو شیرین کم‌شیرین|Light sweet lime sharbat|25|0.2|6.1|0|
شربت لیمو شیرین با شیر|Milky sweet lime sharbat|73|1.7|13.2|1.5|
شربت لیمو شیرین بدون شکر|Sugar-free sweet lime sharbat|6|0.2|1.3|0|
شربت هل|Cardamom sharbat|44|0.1|11|0|
شربت هل غلیظ|Concentrated cardamom sharbat|178|0.4|44|0|
شربت هل یخ|Iced cardamom sharbat|44|0.1|11|0|
شربت هل با یخ و سودا|Sparkling iced cardamom sharbat|31|0.1|7.7|0|
شربت هل کم‌شیرین|Light cardamom sharbat|25|0.1|6.1|0|
شربت هل با شیر|Milky cardamom sharbat|73|1.6|13.2|1.5|
شربت هل بدون شکر|Sugar-free cardamom sharbat|6|0.1|1.3|0|
شربت دارچین|Cinnamon sharbat|44|0.1|11|0|
شربت دارچین غلیظ|Concentrated cinnamon sharbat|178|0.4|44|0|
شربت دارچین یخ|Iced cinnamon sharbat|44|0.1|11|0|
شربت دارچین با یخ و سودا|Sparkling iced cinnamon sharbat|31|0.1|7.7|0|
شربت دارچین کم‌شیرین|Light cinnamon sharbat|25|0.1|6.1|0|
شربت دارچین با شیر|Milky cinnamon sharbat|73|1.6|13.2|1.5|
شربت دارچین بدون شکر|Sugar-free cinnamon sharbat|6|0.1|1.3|0|
شربت زنجبیل غلیظ|Concentrated ginger sharbat|178|0.4|44|0|
شربت زنجبیل یخ|Iced ginger sharbat|44|0.1|11|0|
شربت زنجبیل با یخ و سودا|Sparkling iced ginger sharbat|31|0.1|7.7|0|
شربت زنجبیل کم‌شیرین|Light ginger sharbat|25|0.1|6.1|0|
شربت زنجبیل با شیر|Milky ginger sharbat|73|1.6|13.2|1.5|
شربت زنجبیل بدون شکر|Sugar-free ginger sharbat|6|0.1|1.3|0|
شربت عرق بید|Willow extract sharbat|40|0.1|10|0|
شربت عرق بید غلیظ|Concentrated willow extract sharbat|162|0.4|40|0|
شربت عرق بید یخ|Iced willow extract sharbat|40|0.1|10|0|
شربت عرق بید با یخ و سودا|Sparkling iced willow extract sharbat|28|0.1|7|0|
شربت عرق بید کم‌شیرین|Light willow extract sharbat|22|0.1|5.5|0|
شربت عرق بید با شیر|Milky willow extract sharbat|69|1.6|12.2|1.5|
شربت عرق بید بدون شکر|Sugar-free willow extract sharbat|5|0.1|1.2|0|
شربت شیرین‌بیان|Licorice sharbat|45|0.2|11|0|
شربت شیرین‌بیان غلیظ|Concentrated licorice sharbat|179|0.8|44|0|
شربت شیرین‌بیان یخ|Iced licorice sharbat|45|0.2|11|0|
شربت شیرین‌بیان با یخ و سودا|Sparkling iced licorice sharbat|31|0.1|7.7|0|
شربت شیرین‌بیان کم‌شیرین|Light licorice sharbat|25|0.2|6.1|0|
شربت شیرین‌بیان با شیر|Milky licorice sharbat|73|1.7|13.2|1.5|
شربت شیرین‌بیان بدون شکر|Sugar-free licorice sharbat|6|0.2|1.3|0|
شربت شاه‌توت|White mulberry sharbat|49|0.2|12|0|
شربت شاه‌توت غلیظ|Concentrated white mulberry sharbat|195|0.8|48|0|
شربت شاه‌توت یخ|Iced white mulberry sharbat|49|0.2|12|0|
شربت شاه‌توت با یخ و سودا|Sparkling iced white mulberry sharbat|34|0.1|8.4|0|
شربت شاه‌توت کم‌شیرین|Light white mulberry sharbat|27|0.2|6.6|0|
شربت شاه‌توت با شیر|Milky white mulberry sharbat|77|1.7|14.2|1.5|
شربت شاه‌توت بدون شکر|Sugar-free white mulberry sharbat|7|0.2|1.4|0|
شربت آلوچه|Cherry plum sharbat|49|0.2|12|0|
شربت آلوچه غلیظ|Concentrated cherry plum sharbat|195|0.8|48|0|
شربت آلوچه یخ|Iced cherry plum sharbat|49|0.2|12|0|
شربت آلوچه با یخ و سودا|Sparkling iced cherry plum sharbat|34|0.1|8.4|0|
شربت آلوچه کم‌شیرین|Light cherry plum sharbat|27|0.2|6.6|0|
شربت آلوچه با شیر|Milky cherry plum sharbat|77|1.7|14.2|1.5|
شربت آلوچه بدون شکر|Sugar-free cherry plum sharbat|7|0.2|1.4|0|
شربت زرشک|Barberry sharbat|49|0.2|12|0|
شربت زرشک غلیظ|Concentrated barberry sharbat|195|0.8|48|0|
شربت زرشک یخ|Iced barberry sharbat|49|0.2|12|0|
شربت زرشک با یخ و سودا|Sparkling iced barberry sharbat|34|0.1|8.4|0|
شربت زرشک کم‌شیرین|Light barberry sharbat|27|0.2|6.6|0|
شربت زرشک با شیر|Milky barberry sharbat|77|1.7|14.2|1.5|
شربت زرشک بدون شکر|Sugar-free barberry sharbat|7|0.2|1.4|0|
شربت گیلاس|Cherry sharbat|49|0.2|12|0|
شربت گیلاس غلیظ|Concentrated cherry sharbat|195|0.8|48|0|
شربت گیلاس یخ|Iced cherry sharbat|49|0.2|12|0|
شربت گیلاس با یخ و سودا|Sparkling iced cherry sharbat|34|0.1|8.4|0|
شربت گیلاس کم‌شیرین|Light cherry sharbat|27|0.2|6.6|0|
شربت گیلاس با شیر|Milky cherry sharbat|77|1.7|14.2|1.5|
شربت گیلاس بدون شکر|Sugar-free cherry sharbat|7|0.2|1.4|0|
شربت هندوانه|Watermelon sharbat|46|0.3|11|0.1|
شربت هندوانه غلیظ|Concentrated watermelon sharbat|184|1.2|44|0.4|
شربت هندوانه یخ|Iced watermelon sharbat|46|0.3|11|0.1|
شربت هندوانه با یخ و سودا|Sparkling iced watermelon sharbat|32|0.2|7.7|0.1|
شربت هندوانه کم‌شیرین|Light watermelon sharbat|26|0.3|6.1|0.1|
شربت هندوانه با شیر|Milky watermelon sharbat|74|1.8|13.2|1.6|
شربت هندوانه بدون شکر|Sugar-free watermelon sharbat|7|0.3|1.3|0.1|
شربت طالبی|Cantaloupe sharbat|46|0.3|11|0.1|
شربت طالبی غلیظ|Concentrated cantaloupe sharbat|184|1.2|44|0.4|
شربت طالبی یخ|Iced cantaloupe sharbat|46|0.3|11|0.1|
شربت طالبی با یخ و سودا|Sparkling iced cantaloupe sharbat|32|0.2|7.7|0.1|
شربت طالبی کم‌شیرین|Light cantaloupe sharbat|26|0.3|6.1|0.1|
شربت طالبی با شیر|Milky cantaloupe sharbat|74|1.8|13.2|1.6|
شربت طالبی بدون شکر|Sugar-free cantaloupe sharbat|7|0.3|1.3|0.1|
شربت انگور|Grape sharbat|53|0.3|13|0|
شربت انگور غلیظ|Concentrated grape sharbat|213|1.2|52|0|
شربت انگور یخ|Iced grape sharbat|53|0.3|13|0|
شربت انگور با یخ و سودا|Sparkling iced grape sharbat|37|0.2|9.1|0|
شربت انگور کم‌شیرین|Light grape sharbat|30|0.3|7.2|0|
شربت انگور با شیر|Milky grape sharbat|82|1.8|15.2|1.5|
شربت انگور بدون شکر|Sugar-free grape sharbat|7|0.3|1.6|0|
شربت به|Quince sharbat|49|0.2|12|0|
شربت به غلیظ|Concentrated quince sharbat|195|0.8|48|0|
شربت به یخ|Iced quince sharbat|49|0.2|12|0|
شربت به با یخ و سودا|Sparkling iced quince sharbat|34|0.1|8.4|0|
شربت به کم‌شیرین|Light quince sharbat|27|0.2|6.6|0|
شربت به با شیر|Milky quince sharbat|77|1.7|14.2|1.5|
شربت به بدون شکر|Sugar-free quince sharbat|7|0.2|1.4|0|
شربت سرکه‌شیره|Sirke shireh sharbat|56|0.1|14|0|
شربت سرکه‌شیره غلیظ|Concentrated sirke shireh sharbat|226|0.4|56|0|
شربت سرکه‌شیره یخ|Iced sirke shireh sharbat|56|0.1|14|0|
شربت سرکه‌شیره با یخ و سودا|Sparkling iced sirke shireh sharbat|39|0.1|9.8|0|
شربت سرکه‌شیره کم‌شیرین|Light sirke shireh sharbat|31|0.1|7.7|0|
شربت سرکه‌شیره با شیر|Milky sirke shireh sharbat|85|1.6|16.2|1.5|
شربت سرکه‌شیره بدون شکر|Sugar-free sirke shireh sharbat|7|0.1|1.7|0|
شربت لیمو عمانی|Dried lime sharbat|40|0.1|10|0|
شربت لیمو عمانی غلیظ|Concentrated dried lime sharbat|162|0.4|40|0|
شربت لیمو عمانی یخ|Iced dried lime sharbat|40|0.1|10|0|
شربت لیمو عمانی با یخ و سودا|Sparkling iced dried lime sharbat|28|0.1|7|0|
شربت لیمو عمانی کم‌شیرین|Light dried lime sharbat|22|0.1|5.5|0|
شربت لیمو عمانی با شیر|Milky dried lime sharbat|69|1.6|12.2|1.5|
شربت لیمو عمانی بدون شکر|Sugar-free dried lime sharbat|5|0.1|1.2|0|
شربت پرتقال و دارچین|Orange cinnamon sharbat|49|0.2|12|0|
شربت پرتقال و دارچین غلیظ|Concentrated orange cinnamon sharbat|195|0.8|48|0|
شربت پرتقال و دارچین یخ|Iced orange cinnamon sharbat|49|0.2|12|0|
شربت پرتقال و دارچین با یخ و سودا|Sparkling iced orange cinnamon sharbat|34|0.1|8.4|0|
شربت پرتقال و دارچین کم‌شیرین|Light orange cinnamon sharbat|27|0.2|6.6|0|
شربت پرتقال و دارچین با شیر|Milky orange cinnamon sharbat|77|1.7|14.2|1.5|
شربت پرتقال و دارچین بدون شکر|Sugar-free orange cinnamon sharbat|7|0.2|1.4|0|
شربت ترنجبین|Tarangabin sharbat|52|0.1|13|0|
شربت ترنجبین غلیظ|Concentrated tarangabin sharbat|210|0.4|52|0|
شربت ترنجبین یخ|Iced tarangabin sharbat|52|0.1|13|0|
شربت ترنجبین با یخ و سودا|Sparkling iced tarangabin sharbat|37|0.1|9.1|0|
شربت ترنجبین کم‌شیرین|Light tarangabin sharbat|29|0.1|7.2|0|
شربت ترنجبین با شیر|Milky tarangabin sharbat|81|1.6|15.2|1.5|
شربت ترنجبین بدون شکر|Sugar-free tarangabin sharbat|7|0.1|1.6|0|
شربت شکر|Sugar sharbat|48|0|12|0|
شربت شکر غلیظ|Concentrated sugar sharbat|192|0|48|0|
شربت شکر یخ|Iced sugar sharbat|48|0|12|0|
شربت شکر با یخ و سودا|Sparkling iced sugar sharbat|34|0|8.4|0|
شربت شکر کم‌شیرین|Light sugar sharbat|26|0|6.6|0|
شربت شکر با شیر|Milky sugar sharbat|76|1.5|14.2|1.5|
شربت شکر بدون شکر|Sugar-free sugar sharbat|6|0|1.4|0|
شربت قند|Sugar cube sharbat|48|0|12|0|
شربت قند غلیظ|Concentrated sugar cube sharbat|192|0|48|0|
شربت قند یخ|Iced sugar cube sharbat|48|0|12|0|
شربت قند با یخ و سودا|Sparkling iced sugar cube sharbat|34|0|8.4|0|
شربت قند کم‌شیرین|Light sugar cube sharbat|26|0|6.6|0|
شربت قند با شیر|Milky sugar cube sharbat|76|1.5|14.2|1.5|
شربت قند بدون شکر|Sugar-free sugar cube sharbat|6|0|1.4|0|
شربت نبات|Rock candy sharbat|48|0|12|0|
شربت نبات غلیظ|Concentrated rock candy sharbat|192|0|48|0|
شربت نبات یخ|Iced rock candy sharbat|48|0|12|0|
شربت نبات با یخ و سودا|Sparkling iced rock candy sharbat|34|0|8.4|0|
شربت نبات کم‌شیرین|Light rock candy sharbat|26|0|6.6|0|
شربت نبات با شیر|Milky rock candy sharbat|76|1.5|14.2|1.5|
شربت نبات بدون شکر|Sugar-free rock candy sharbat|6|0|1.4|0|
شربت خرما|Date sharbat|58|0.4|14|0|
شربت خرما غلیظ|Concentrated date sharbat|230|1.6|56|0|
شربت خرما یخ|Iced date sharbat|58|0.4|14|0|
شربت خرما با یخ و سودا|Sparkling iced date sharbat|40|0.3|9.8|0|
شربت خرما کم‌شیرین|Light date sharbat|32|0.4|7.7|0|
شربت خرما با شیر|Milky date sharbat|86|1.9|16.2|1.5|
شربت خرما بدون شکر|Sugar-free date sharbat|8|0.4|1.7|0|
شربت کشمش|Raisin sharbat|54|0.4|13|0|
شربت کشمش غلیظ|Concentrated raisin sharbat|214|1.6|52|0|
شربت کشمش یخ|Iced raisin sharbat|54|0.4|13|0|
شربت کشمش با یخ و سودا|Sparkling iced raisin sharbat|38|0.3|9.1|0|
شربت کشمش کم‌شیرین|Light raisin sharbat|30|0.4|7.2|0|
شربت کشمش با شیر|Milky raisin sharbat|82|1.9|15.2|1.5|
شربت کشمش بدون شکر|Sugar-free raisin sharbat|8|0.4|1.6|0|
شربت عناب|Jujube sharbat|49|0.3|12|0|
شربت عناب غلیظ|Concentrated jujube sharbat|197|1.2|48|0|
شربت عناب یخ|Iced jujube sharbat|49|0.3|12|0|
شربت عناب با یخ و سودا|Sparkling iced jujube sharbat|34|0.2|8.4|0|
شربت عناب کم‌شیرین|Light jujube sharbat|28|0.3|6.6|0|
شربت عناب با شیر|Milky jujube sharbat|78|1.8|14.2|1.5|
شربت عناب بدون شکر|Sugar-free jujube sharbat|7|0.3|1.4|0|
شربت نارنگی|Mandarin sharbat|49|0.2|12|0|
شربت نارنگی غلیظ|Concentrated mandarin sharbat|195|0.8|48|0|
شربت نارنگی یخ|Iced mandarin sharbat|49|0.2|12|0|
شربت نارنگی با یخ و سودا|Sparkling iced mandarin sharbat|34|0.1|8.4|0|
شربت نارنگی کم‌شیرین|Light mandarin sharbat|27|0.2|6.6|0|
شربت نارنگی با شیر|Milky mandarin sharbat|77|1.7|14.2|1.5|
شربت نارنگی بدون شکر|Sugar-free mandarin sharbat|7|0.2|1.4|0|
شربت انجیر|Fig sharbat|53|0.3|13|0|
شربت انجیر غلیظ|Concentrated fig sharbat|213|1.2|52|0|
شربت انجیر یخ|Iced fig sharbat|53|0.3|13|0|
شربت انجیر با یخ و سودا|Sparkling iced fig sharbat|37|0.2|9.1|0|
شربت انجیر کم‌شیرین|Light fig sharbat|30|0.3|7.2|0|
شربت انجیر با شیر|Milky fig sharbat|82|1.8|15.2|1.5|
شربت انجیر بدون شکر|Sugar-free fig sharbat|7|0.3|1.6|0|
شربت پاپایا|Papaya sharbat|49|0.2|12|0|
شربت پاپایا غلیظ|Concentrated papaya sharbat|195|0.8|48|0|
شربت پاپایا یخ|Iced papaya sharbat|49|0.2|12|0|
شربت پاپایا با یخ و سودا|Sparkling iced papaya sharbat|34|0.1|8.4|0|
شربت پاپایا کم‌شیرین|Light papaya sharbat|27|0.2|6.6|0|
شربت پاپایا با شیر|Milky papaya sharbat|77|1.7|14.2|1.5|
شربت پاپایا بدون شکر|Sugar-free papaya sharbat|7|0.2|1.4|0|
شیرکاکائو|Chocolate milk|69|3.3|10|1.8|
شیرکاکائو کم‌چرب|Low-fat chocolate milk|61|3.4|10|0.8|
شیرکاکائو بسته‌بندی|Packaged chocolate milk|70|3|11|1.5|
شیرکاکائو پرچرب|Whole chocolate milk|86|3.2|11|3.2|
شیرکاکائو با موز|Banana chocolate milk|79|3|13|1.7|
شیرکاکائو با نعنا|Mint chocolate milk|69|3.2|10|1.8|
شیرکاکائو بدون شکر|Sugar-free chocolate milk|49|3.4|5|1.7|
شیرکاکائو داغ|Hot chocolate milk|69|3.3|10|1.8|
شیرکاکائو با فندق|Hazelnut chocolate milk|78|3.3|11|2.3|
شیرکاکائو ورزشی|Sports chocolate milk|61|5|8|1|
شیر موز بسته‌بندی|Packaged banana milk|72|3|11|1.8|
شیر وانیل|Vanilla milk|65|3.2|9|1.8|
شیر پسته|Pistachio milk drink|67|3.3|9|2|
شیر قهوه سرد|Cold coffee milk|63|3|9|1.7|
شیر عسل و دارچین|Honey cinnamon milk|61|3.3|8|1.8|
شیر با زنجبیل|Milk with ginger|60|3.2|5|3|
شیر با زعفران و عسل|Milk with saffron and honey|76|3.3|9|3|
شیر با خرما|Milk with dates|84|3.3|11|3|
شیر با موز و عسل|Milk with banana and honey|86|3.2|12|2.8|
شیر با بادام و عسل|Milk with almond and honey|84|3.8|9|3.6|
شیر گرم با زردچوبه|Hot turmeric milk|64|3.2|6|3|
شیر با هل|Cardamom milk|64|3.3|6|3|
شیر گل‌سرخ|Rose milk|67|3.3|9|2|
شیر با نارگیل|Coconut milk|87|2.5|8|5|
شیر با شکلات سفید|White chocolate milk|89|3.3|11|3.5|
سحلب با پسته|Sahlab with pistachio|112|3|16|4|
سحلب با نارگیل|Sahlab with coconut|114|2.6|17|4|
سحلب با گلاب|Sahlab with rosewater|105|2.5|17|3|
سحلب با شکلات|Chocolate sahlab|119|2.8|19|3.5|
سحلب با آجیل|Sahlab with nuts|127|3.5|17|5|
سحلب بدون شکر|Sugar-free sahlab|59|3|5|3|
بوزه|Boza|80|1|18|0.5|
آب‌جو بدون الکل|Non-alcoholic malt drink|21|0.3|5|0|
نوشیدنی مالت|Malt drink|26|0.4|6|0|
نوشیدنی مالت لیمو|Lemon malt drink|25|0.3|6|0|
نوشیدنی مالت هلو|Peach malt drink|25|0.3|6|0|
نوشیدنی مالت پرتقال|Orange malt drink|25|0.3|6|0|
دوغ شیرین|Sweet doogh|56|2.5|8|1.5|
دوغ میوه‌ای|Fruit doogh|58|2.4|9|1.4|
لسی|Lassi|87|3|12|3|
لسی انبه|Mango lassi|100|2.8|16|2.8|
لسی شیرین|Sweet lassi|95|3|14|3|
لسی نمکی|Salted lassi|59|3|5|3|
لسی گلاب|Rose lassi|91|3|13|3|
لسی توت‌فرنگی|Strawberry lassi|96|2.8|15|2.8|
لسی زعفرانی|Saffron lassi|87|3|12|3|
لسی هل|Cardamom lassi|87|3|12|3|
لسی پسته|Pistachio lassi|98|3.5|13|3.5|
لسی موز|Banana lassi|105|3|17|2.8|
لسی کم‌چرب|Low-fat lassi|68|3.2|12|0.8|
ماست‌خوری شیرین|Sweet yogurt drink|78|3|12|2|
کفیر شیرین|Sweet kefir|58|3.2|8|1.5|
کفیر میوه‌ای|Fruit kefir|66|3|10|1.5|
کفیر توت‌فرنگی|Strawberry kefir|66|3|10|1.5|
کفیر عسلی|Honey kefir|62|3.2|9|1.5|
عرق بید|Willow distillate|1|0|0|0|
عرق کاسنی|Chicory distillate|1|0|0|0|
عرق شاه‌تره|Fumitory distillate|1|0|0|0|
عرق گاوزبان|Borage distillate|1|0|0|0|
عرق بهارنارنج|Orange blossom distillate|1|0|0|0|
عرق گلاب|Rose distillate|1|0|0|0|
عرق شیرین‌بیان|Licorice distillate|1|0|0|0|
عرق سنبل‌الطیب|Valerian distillate|1|0|0|0|
عرق زیره|Cumin distillate|1|0|0|0|
عرق رازیانه|Fennel distillate|1|0|0|0|
عرق ریحان|Basil distillate|1|0|0|0|
عرق خارشتر|Camelthorn distillate|1|0|0|0|
عرق کاکوتی|Wild thyme distillate|1|0|0|0|
عرق انیسون|Anise distillate|1|0|0|0|
عرق چای ترش|Hibiscus distillate|1|0|0|0|
دمنوش آلبالو|Sour cherry infusion|4|0|1|0|
دمنوش ترکیبی گیاهی|Herbal blend infusion|1|0|0.3|0|
دمنوش آرامش|Calming herbal infusion|1|0|0.3|0|
دمنوش سرماخوردگی|Cold relief herbal infusion|4|0|1|0|
دمنوش لاغری|Slimming herbal infusion|1|0|0.3|0|
دمنوش میوه خشک|Dried fruit infusion|12|0|3|0|
دمنوش هل و دارچین|Cardamom cinnamon infusion|2|0|0.5|0|
دمنوش به‌دانه|Quince seed infusion|4|0|1|0|
دمنوش تخم کتان|Flax seed infusion|9|0.3|0.8|0.5|
دمنوش آویشن و عسل|Thyme honey infusion|20|0|5|0|
دمنوش بابونه و عسل|Chamomile honey infusion|20|0|5|0|
دمنوش زنجبیل و لیمو|Ginger lemon infusion|6|0|1.5|0|
دمنوش زنجبیل و عسل|Ginger honey infusion|20|0|5|0|
دمنوش دارچین و عسل|Cinnamon honey infusion|20|0|5|0|
دمنوش زردچوبه و عسل|Turmeric honey infusion|20|0|5|0|
دمنوش چای سبز و نعنا|Green tea mint infusion|1|0|0.2|0|
دمنوش چای سبز و لیمو|Green tea lemon infusion|3|0|0.8|0|
دمنوش چای سبز و جینسینگ|Green tea ginseng infusion|1|0|0.3|0|
شیرینی عید نوروز|Nowruz pastry|468|7|56|24|
سمنو عید|Eid samanu|159|3|30|3|
نان برنجی عید|Nowruz rice cookie|480|6|60|24|
نان نخودچی عید|Nowruz chickpea cookie|470|8|60|22|
باقلوای عید|Nowruz baklava|472|7|48|28|
کلوچه عید|Nowruz kolucheh|461|7|52|25|
نقل عید|Nowruz noghl|416|7|70|12|
حلوا عید|Nowruz halva|376|3|64|12|
شیرینی ترش نوروزی|Nowruz fruit candy|333|1|80|1|
نان کنجدی عید|Nowruz sesame cookie|481|8|56|25|
سوهان عید|Nowruz sohan|498|6|60|26|
شیرینی کشمشی عید|Nowruz raisin cookie|462|6|60|22|
شیرینی نارگیلی عید|Nowruz coconut cookie|482|6|56|26|
شیرینی گردویی عید|Nowruz walnut cookie|494|8|48|30|
شیرینی بادامی عید|Nowruz almond cookie|488|9|50|28|
شیرینی خامه‌ای عید|Nowruz cream pastry|344|5|36|20|
شکلات عید|Nowruz chocolate|535|7|57|31|
آجیل عید|Nowruz nut mix|578|14|18|50|
آجیل شیرین عید|Nowruz sweet nut mix|496|12|40|32|
شیرینی کاسنی|Chicory sweet|446|6|56|22|
مربا عید|Nowruz jam|258|0.4|64|0.1|
شله زرد عید|Nowruz sholeh zard|151|1|30|3|
حلوا عید با زعفران|Nowruz saffron halva|377|3|62|13|
شیرینی لقمه‌ای عید|Nowruz bite pastry|464|6|56|24|
نان خرمایی عید|Nowruz date cookie|452|6|62|20|
کیک عید|Nowruz cake|390|5|52|18|
شیرینی ملوس عید|Nowruz delicate cookie|454|6|58|22|
شیرینی زبان عید|Nowruz shirini zaban|454|8|56|22|
شیرینی فرانسوی عید|Nowruz French pastry|336|5|34|20|
شیرینی بستنی‌ای عید|Nowruz ice cream pastry|296|4|34|16|
شیرینی کوکی عید|Nowruz cookie|488|6|62|24|
شیرینی ایتالیایی عید|Nowruz Italian pastry|348|6|36|20|
بیسکویت عید|Nowruz biscuit|443|7|70|15|
شیرینی کره‌ای عید|Nowruz butter cookie|496|7|54|28|
کلوچه گردویی عید|Nowruz walnut kolucheh|500|8|45|32|
باسلوق عید|Nowruz basloq|382|3|70|10|
لوز عید|Nowruz luz|512|10|55|28|
گز عید|Nowruz gaz|434|5|72|14|
پشمک عید|Nowruz pashmak|432|1|80|12|
قطاب عید|Nowruz qottab|466|8|50|26|
نان قندی عید|Nowruz sugar bread|454|7|66|18|
نان شیرمال عید|Nowruz sheermal|326|9|50|10|
نان نخودچی با گلاب عید|Nowruz rosewater chickpea cookie|470|8|60|22|
ترشی لواشک عید|Nowruz lavashak|313|1|75|1|
شیرینی ترکی عید|Nowruz Turkish sweet|450|5|58|22|
فرنی عید|Nowruz ferni|113|3.5|18|3|
شیر برنج عید|Nowruz shir berenj|119|3|20|3|
سمنوی نذری|Nazri samanu|159|3|30|3|
کاچی نذری|Nazri kachi|221|3|32|9|
`;
export const SWEETS2 = S1 + S2 + S3 + S4;
