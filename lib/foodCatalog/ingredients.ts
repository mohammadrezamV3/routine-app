// کاتالوگ غذا (مواد خام و پایه): گوشت، آبزیان، تخم‌مرغ، سبزی، میوه، غلات، حبوبات، آجیل، روغن، ادویه، قارچ، سویا، غذای کودک.
// قالب خط مثل staples.ts؛ مقدار به‌ازای 100 گرم (یا میلی‌لیتر).
const ING_MEAT = `
گوشت گاو ران خام|Beef round, lean and fat, raw|134|21|0|5.5|ران گاو
گوشت گاو ران آب‌پز|Beef round, lean and fat, boiled|167|28.4|0|5.9|ران گاو
گوشت گاو ران کبابی|Beef round, lean and fat, grilled|172|29|0|6.2|ران گاو
گوشت گاو ران سرخ‌شده در تابه|Beef round, lean and fat, pan-fried|207|28.6|0|10.3|ران گاو
گوشت گاو ران خورشتی (پخته در خورش)|Beef round, lean and fat, stewed|157|26.3|0|5.7|ران گاو
گوشت گاو ران بدون چربی خام|Beef round, lean only, raw|113|22|0|2.8|
گوشت گاو ران بدون چربی آب‌پز|Beef round, lean only, boiled|146|29.7|0|3|
گوشت گاو ران بدون چربی کبابی|Beef round, lean only, grilled|150|30.4|0|3.1|
گوشت گاو ران بدون چربی سرخ‌شده در تابه|Beef round, lean only, pan-fried|184|29.9|0|7.2|
گوشت گاو ران بدون چربی خورشتی (پخته در خورش)|Beef round, lean only, stewed|136|27.5|0|2.9|
گوشت گاو راسته خام|Beef top sirloin, raw|134|21|0|5.6|راسته گاو
گوشت گاو راسته آب‌پز|Beef top sirloin, boiled|168|28.4|0|6|راسته گاو
گوشت گاو راسته کبابی|Beef top sirloin, grilled|173|29|0|6.3|راسته گاو
گوشت گاو راسته سرخ‌شده در تابه|Beef top sirloin, pan-fried|208|28.6|0|10.4|راسته گاو
گوشت گاو راسته خورشتی (پخته در خورش)|Beef top sirloin, stewed|157|26.3|0|5.8|راسته گاو
گوشت گاو فیله خام|Beef tenderloin, raw|150|20.7|0|7.5|فیله گاو
گوشت گاو فیله آب‌پز|Beef tenderloin, boiled|185|27.9|0|8.1|فیله گاو
گوشت گاو فیله کبابی|Beef tenderloin, grilled|190|28.6|0|8.4|فیله گاو
گوشت گاو فیله سرخ‌شده در تابه|Beef tenderloin, pan-fried|226|28.2|0|12.6|فیله گاو
گوشت گاو فیله خورشتی (پخته در خورش)|Beef tenderloin, stewed|173|25.9|0|7.7|فیله گاو
گوشت گاو ریب‌آی خام|Beef ribeye, raw|220|19|0|16|ریب آی
گوشت گاو ریب‌آی آب‌پز|Beef ribeye, boiled|259|25.7|0|17.3|ریب آی
گوشت گاو ریب‌آی کبابی|Beef ribeye, grilled|266|26.2|0|17.9|ریب آی
گوشت گاو ریب‌آی سرخ‌شده در تابه|Beef ribeye, pan-fried|305|25.8|0|22.4|ریب آی
گوشت گاو ریب‌آی خورشتی (پخته در خورش)|Beef ribeye, stewed|244|23.8|0|16.5|ریب آی
گوشت گاو تی‌بن خام|Beef T-bone, raw|195|19.5|0|13|تی بن
گوشت گاو تی‌بن آب‌پز|Beef T-bone, boiled|231|26.3|0|14|تی بن
گوشت گاو تی‌بن کبابی|Beef T-bone, grilled|239|26.9|0|14.6|تی بن
گوشت گاو تی‌بن سرخ‌شده در تابه|Beef T-bone, pan-fried|276|26.5|0|18.9|تی بن
گوشت گاو تی‌بن خورشتی (پخته در خورش)|Beef T-bone, stewed|218|24.4|0|13.4|تی بن
گوشت گاو سینه خام|Beef brisket, raw|200|18.5|0|14|
گوشت گاو سینه آب‌پز|Beef brisket, boiled|236|25|0|15.1|
گوشت گاو سینه کبابی|Beef brisket, grilled|243|25.5|0|15.7|
گوشت گاو سینه سرخ‌شده در تابه|Beef brisket, pan-fried|282|25.2|0|20.1|
گوشت گاو سینه خورشتی (پخته در خورش)|Beef brisket, stewed|222|23.1|0|14.4|
گوشت گاو دنده خام|Beef short ribs, raw|271|16|0|23|
گوشت گاو دنده آب‌پز|Beef short ribs, boiled|310|21.6|0|24.8|
گوشت گاو دنده کبابی|Beef short ribs, grilled|321|22.1|0|25.8|
گوشت گاو دنده سرخ‌شده در تابه|Beef short ribs, pan-fried|361|21.8|0|30.4|
گوشت گاو دنده خورشتی (پخته در خورش)|Beef short ribs, stewed|293|20|0|23.7|
گوشت گاو سردست خام|Beef chuck, raw|177|19.5|0|11|سردست گاو
گوشت گاو سردست آب‌پز|Beef chuck, boiled|212|26.3|0|11.9|سردست گاو
گوشت گاو سردست کبابی|Beef chuck, grilled|218|26.9|0|12.3|سردست گاو
گوشت گاو سردست سرخ‌شده در تابه|Beef chuck, pan-fried|255|26.5|0|16.6|سردست گاو
گوشت گاو سردست خورشتی (پخته در خورش)|Beef chuck, stewed|199|24.4|0|11.3|سردست گاو
گوشت گاو گردن خام|Beef neck, raw|166|19|0|10|گردن گاو
گوشت گاو گردن آب‌پز|Beef neck, boiled|200|25.7|0|10.8|گردن گاو
گوشت گاو گردن کبابی|Beef neck, grilled|206|26.2|0|11.2|گردن گاو
گوشت گاو گردن سرخ‌شده در تابه|Beef neck, pan-fried|243|25.8|0|15.5|گردن گاو
گوشت گاو گردن خورشتی (پخته در خورش)|Beef neck, stewed|188|23.8|0|10.3|گردن گاو
گوشت گاو ماهیچه خام|Beef shank, raw|125|21|0|4.5|ماهیچه گاو
گوشت گاو ماهیچه آب‌پز|Beef shank, boiled|158|28.4|0|4.9|ماهیچه گاو
گوشت گاو ماهیچه کبابی|Beef shank, grilled|161|29|0|5|ماهیچه گاو
گوشت گاو ماهیچه سرخ‌شده در تابه|Beef shank, pan-fried|197|28.6|0|9.2|ماهیچه گاو
گوشت گاو ماهیچه خورشتی (پخته در خورش)|Beef shank, stewed|147|26.3|0|4.6|ماهیچه گاو
گوشت گاو شانه خام|Beef shoulder clod, raw|139|20|0|6.5|
گوشت گاو شانه آب‌پز|Beef shoulder clod, boiled|171|27|0|7|
گوشت گاو شانه کبابی|Beef shoulder clod, grilled|176|27.6|0|7.3|
گوشت گاو شانه سرخ‌شده در تابه|Beef shoulder clod, pan-fried|212|27.2|0|11.5|
گوشت گاو شانه خورشتی (پخته در خورش)|Beef shoulder clod, stewed|160|25|0|6.7|
گوشت گاو قلوه‌گاه خام|Beef flank steak, raw|138|21|0|6|
گوشت گاو قلوه‌گاه آب‌پز|Beef flank steak, boiled|172|28.4|0|6.5|
گوشت گاو قلوه‌گاه کبابی|Beef flank steak, grilled|176|29|0|6.7|
گوشت گاو قلوه‌گاه سرخ‌شده در تابه|Beef flank steak, pan-fried|213|28.6|0|10.9|
گوشت گاو قلوه‌گاه خورشتی (پخته در خورش)|Beef flank steak, stewed|161|26.3|0|6.2|
گوشت گاو لخم خام|Beef lean stewing meat, raw|118|21.5|0|3.5|گوشت لخم گاو
گوشت گاو لخم آب‌پز|Beef lean stewing meat, boiled|150|29|0|3.8|گوشت لخم گاو
گوشت گاو لخم کبابی|Beef lean stewing meat, grilled|154|29.7|0|3.9|گوشت لخم گاو
گوشت گاو لخم سرخ‌شده در تابه|Beef lean stewing meat, pan-fried|189|29.2|0|8|گوشت لخم گاو
گوشت گاو لخم خورشتی (پخته در خورش)|Beef lean stewing meat, stewed|140|26.9|0|3.6|گوشت لخم گاو
گوشت گاو دم خام|Beef oxtail, raw|180|18|0|12|دم گاو
گوشت گاو دم آب‌پز|Beef oxtail, boiled|214|24.3|0|13|دم گاو
گوشت گاو دم کبابی|Beef oxtail, grilled|220|24.8|0|13.4|دم گاو
گوشت گاو دم سرخ‌شده در تابه|Beef oxtail, pan-fried|258|24.5|0|17.8|دم گاو
گوشت گاو دم خورشتی (پخته در خورش)|Beef oxtail, stewed|202|22.5|0|12.4|دم گاو
گوشت گاو زبان خام|Beef tongue meat, raw|205|14.9|0|16.1|
گوشت گاو زبان آب‌پز|Beef tongue meat, boiled|237|20.1|0|17.4|
گوشت گاو زبان کبابی|Beef tongue meat, grilled|244|20.6|0|18|
گوشت گاو زبان سرخ‌شده در تابه|Beef tongue meat, pan-fried|284|20.3|0|22.5|
گوشت گاو زبان خورشتی (پخته در خورش)|Beef tongue meat, stewed|224|18.6|0|16.6|
گوشت چرخ‌کرده گاو 70 درصد بدون چربی خام|Ground beef 70% lean, raw|326|14.1|0|30|
گوشت چرخ‌کرده گاو 70 درصد بدون چربی آب‌پز|Ground beef 70% lean, boiled|368|19|0|32.4|
گوشت چرخ‌کرده گاو 70 درصد بدون چربی کبابی|Ground beef 70% lean, grilled|380|19.5|0|33.6|
گوشت چرخ‌کرده گاو 70 درصد بدون چربی سرخ‌شده در تابه|Ground beef 70% lean, pan-fried|423|19.2|0|38.5|
گوشت چرخ‌کرده گاو 70 درصد بدون چربی خورشتی (پخته در خورش)|Ground beef 70% lean, stewed|349|17.6|0|30.9|
گوشت چرخ‌کرده گاو 80 درصد بدون چربی خام|Ground beef 80% lean, raw|249|17.2|0|20|
گوشت چرخ‌کرده گاو 80 درصد بدون چربی آب‌پز|Ground beef 80% lean, boiled|287|23.2|0|21.6|
گوشت چرخ‌کرده گاو 80 درصد بدون چربی کبابی|Ground beef 80% lean, grilled|296|23.7|0|22.4|
گوشت چرخ‌کرده گاو 80 درصد بدون چربی سرخ‌شده در تابه|Ground beef 80% lean, pan-fried|337|23.4|0|27|
گوشت چرخ‌کرده گاو 80 درصد بدون چربی خورشتی (پخته در خورش)|Ground beef 80% lean, stewed|271|21.5|0|20.6|
گوشت چرخ‌کرده گاو 85 درصد بدون چربی خام|Ground beef 85% lean, raw|209|18.6|0|15|
گوشت چرخ‌کرده گاو 85 درصد بدون چربی آب‌پز|Ground beef 85% lean, boiled|246|25.1|0|16.2|
گوشت چرخ‌کرده گاو 85 درصد بدون چربی کبابی|Ground beef 85% lean, grilled|254|25.7|0|16.8|
گوشت چرخ‌کرده گاو 85 درصد بدون چربی سرخ‌شده در تابه|Ground beef 85% lean, pan-fried|293|25.3|0|21.3|
گوشت چرخ‌کرده گاو 85 درصد بدون چربی خورشتی (پخته در خورش)|Ground beef 85% lean, stewed|233|23.3|0|15.5|
گوشت چرخ‌کرده گاو 90 درصد بدون چربی خام|Ground beef 90% lean, raw|170|20|0|10|
گوشت چرخ‌کرده گاو 90 درصد بدون چربی آب‌پز|Ground beef 90% lean, boiled|205|27|0|10.8|
گوشت چرخ‌کرده گاو 90 درصد بدون چربی کبابی|Ground beef 90% lean, grilled|211|27.6|0|11.2|
گوشت چرخ‌کرده گاو 90 درصد بدون چربی سرخ‌شده در تابه|Ground beef 90% lean, pan-fried|248|27.2|0|15.5|
گوشت چرخ‌کرده گاو 90 درصد بدون چربی خورشتی (پخته در خورش)|Ground beef 90% lean, stewed|193|25|0|10.3|
گوشت چرخ‌کرده گاو 93 درصد بدون چربی خام|Ground beef 93% lean, raw|147|20.9|0|7|
گوشت چرخ‌کرده گاو 93 درصد بدون چربی آب‌پز|Ground beef 93% lean, boiled|181|28.2|0|7.6|
گوشت چرخ‌کرده گاو 93 درصد بدون چربی کبابی|Ground beef 93% lean, grilled|185|28.8|0|7.8|
گوشت چرخ‌کرده گاو 93 درصد بدون چربی سرخ‌شده در تابه|Ground beef 93% lean, pan-fried|222|28.4|0|12|
گوشت چرخ‌کرده گاو 93 درصد بدون چربی خورشتی (پخته در خورش)|Ground beef 93% lean, stewed|169|26.1|0|7.2|
گوشت چرخ‌کرده گاو 95 درصد بدون چربی خام|Ground beef 95% lean, raw|131|21.4|0|5|
گوشت چرخ‌کرده گاو 95 درصد بدون چربی آب‌پز|Ground beef 95% lean, boiled|164|28.9|0|5.4|
گوشت چرخ‌کرده گاو 95 درصد بدون چربی کبابی|Ground beef 95% lean, grilled|168|29.5|0|5.6|
گوشت چرخ‌کرده گاو 95 درصد بدون چربی سرخ‌شده در تابه|Ground beef 95% lean, pan-fried|205|29.1|0|9.8|
گوشت چرخ‌کرده گاو 95 درصد بدون چربی خورشتی (پخته در خورش)|Ground beef 95% lean, stewed|154|26.8|0|5.2|
گوشت گوساله ران خام|Veal leg, raw|108|20.7|0|2.8|ران گوساله
گوشت گوساله ران آب‌پز|Veal leg, boiled|139|27.9|0|3|ران گوساله
گوشت گوساله ران کبابی|Veal leg, grilled|142|28.6|0|3.1|ران گوساله
گوشت گوساله ران سرخ‌شده در تابه|Veal leg, pan-fried|178|28.2|0|7.2|ران گوساله
گوشت گوساله ران خورشتی (پخته در خورش)|Veal leg, stewed|130|25.9|0|2.9|ران گوساله
گوشت گوساله راسته خام|Veal loin, raw|120|20.5|0|4.2|
گوشت گوساله راسته آب‌پز|Veal loin, boiled|151|27.7|0|4.5|
گوشت گوساله راسته کبابی|Veal loin, grilled|156|28.3|0|4.7|
گوشت گوساله راسته سرخ‌شده در تابه|Veal loin, pan-fried|191|27.9|0|8.8|
گوشت گوساله راسته خورشتی (پخته در خورش)|Veal loin, stewed|141|25.6|0|4.3|
گوشت گوساله فیله خام|Veal tenderloin, raw|110|20.4|0|3.2|
گوشت گوساله فیله آب‌پز|Veal tenderloin, boiled|142|27.5|0|3.5|
گوشت گوساله فیله کبابی|Veal tenderloin, grilled|145|28.2|0|3.6|
گوشت گوساله فیله سرخ‌شده در تابه|Veal tenderloin, pan-fried|180|27.7|0|7.7|
گوشت گوساله فیله خورشتی (پخته در خورش)|Veal tenderloin, stewed|132|25.5|0|3.3|
گوشت گوساله سردست خام|Veal shoulder, raw|128|19.5|0|5.5|
گوشت گوساله سردست آب‌پز|Veal shoulder, boiled|158|26.3|0|5.9|
گوشت گوساله سردست کبابی|Veal shoulder, grilled|163|26.9|0|6.2|
گوشت گوساله سردست سرخ‌شده در تابه|Veal shoulder, pan-fried|199|26.5|0|10.3|
گوشت گوساله سردست خورشتی (پخته در خورش)|Veal shoulder, stewed|149|24.4|0|5.7|
گوشت گوساله ماهیچه خام|Veal shank, raw|107|20.5|0|2.8|
گوشت گوساله ماهیچه آب‌پز|Veal shank, boiled|138|27.7|0|3|
گوشت گوساله ماهیچه کبابی|Veal shank, grilled|141|28.3|0|3.1|
گوشت گوساله ماهیچه سرخ‌شده در تابه|Veal shank, pan-fried|176|27.9|0|7.2|
گوشت گوساله ماهیچه خورشتی (پخته در خورش)|Veal shank, stewed|129|25.6|0|2.9|
گوشت گوساله سینه خام|Veal breast, raw|147|17.5|0|8.5|
گوشت گوساله سینه آب‌پز|Veal breast, boiled|177|23.6|0|9.2|
گوشت گوساله سینه کبابی|Veal breast, grilled|182|24.1|0|9.5|
گوشت گوساله سینه سرخ‌شده در تابه|Veal breast, pan-fried|219|23.8|0|13.8|
گوشت گوساله سینه خورشتی (پخته در خورش)|Veal breast, stewed|167|21.9|0|8.8|
گوشت گوساله دنده خام|Veal ribs, raw|137|18|0|7.2|
گوشت گوساله دنده آب‌پز|Veal ribs, boiled|167|24.3|0|7.8|
گوشت گوساله دنده کبابی|Veal ribs, grilled|172|24.8|0|8.1|
گوشت گوساله دنده سرخ‌شده در تابه|Veal ribs, pan-fried|209|24.5|0|12.3|
گوشت گوساله دنده خورشتی (پخته در خورش)|Veal ribs, stewed|157|22.5|0|7.4|
گوشت گوساله گردن خام|Veal neck, raw|130|19|0|6|
گوشت گوساله گردن آب‌پز|Veal neck, boiled|161|25.7|0|6.5|
گوشت گوساله گردن کبابی|Veal neck, grilled|165|26.2|0|6.7|
گوشت گوساله گردن سرخ‌شده در تابه|Veal neck, pan-fried|201|25.8|0|10.9|
گوشت گوساله گردن خورشتی (پخته در خورش)|Veal neck, stewed|151|23.8|0|6.2|
گوشت چرخ‌کرده گوساله خام|Ground veal, raw|139|19.1|0|6.9|
گوشت چرخ‌کرده گوساله آب‌پز|Ground veal, boiled|171|25.8|0|7.5|
گوشت چرخ‌کرده گوساله کبابی|Ground veal, grilled|175|26.4|0|7.7|
گوشت چرخ‌کرده گوساله سرخ‌شده در تابه|Ground veal, pan-fried|211|26|0|11.9|
گوشت چرخ‌کرده گوساله خورشتی (پخته در خورش)|Ground veal, stewed|160|23.9|0|7.1|
گوشت گوسفند ران خام|Lamb leg, lean and fat, raw|155|19.8|0|8.4|ران گوسفند
گوشت گوسفند ران آب‌پز|Lamb leg, lean and fat, boiled|189|26.7|0|9.1|ران گوسفند
گوشت گوسفند ران کبابی|Lamb leg, lean and fat, grilled|194|27.3|0|9.4|ران گوسفند
گوشت گوسفند ران سرخ‌شده در تابه|Lamb leg, lean and fat, pan-fried|231|26.9|0|13.7|ران گوسفند
گوشت گوسفند ران خورشتی (پخته در خورش)|Lamb leg, lean and fat, stewed|178|24.8|0|8.7|ران گوسفند
گوشت گوسفند ران بدون چربی خام|Lamb leg, lean only, raw|118|21|0|3.8|
گوشت گوسفند ران بدون چربی آب‌پز|Lamb leg, lean only, boiled|151|28.4|0|4.1|
گوشت گوسفند ران بدون چربی کبابی|Lamb leg, lean only, grilled|155|29|0|4.3|
گوشت گوسفند ران بدون چربی سرخ‌شده در تابه|Lamb leg, lean only, pan-fried|190|28.6|0|8.4|
گوشت گوسفند ران بدون چربی خورشتی (پخته در خورش)|Lamb leg, lean only, stewed|140|26.3|0|3.9|
گوشت گوسفند راسته خام|Lamb loin, raw|191|18.5|0|13|
گوشت گوسفند راسته آب‌پز|Lamb loin, boiled|226|25|0|14|
گوشت گوسفند راسته کبابی|Lamb loin, grilled|233|25.5|0|14.6|
گوشت گوسفند راسته سرخ‌شده در تابه|Lamb loin, pan-fried|271|25.2|0|18.9|
گوشت گوسفند راسته خورشتی (پخته در خورش)|Lamb loin, stewed|213|23.1|0|13.4|
گوشت گوسفند دنده (ریک) خام|Lamb rib rack, raw|250|17.5|0|20|
گوشت گوسفند دنده (ریک) آب‌پز|Lamb rib rack, boiled|289|23.6|0|21.6|
گوشت گوسفند دنده (ریک) کبابی|Lamb rib rack, grilled|298|24.1|0|22.4|
گوشت گوسفند دنده (ریک) سرخ‌شده در تابه|Lamb rib rack, pan-fried|338|23.8|0|27|
گوشت گوسفند دنده (ریک) خورشتی (پخته در خورش)|Lamb rib rack, stewed|273|21.9|0|20.6|
گوشت گوسفند سردست خام|Lamb shoulder, raw|211|17.8|0|15.5|سردست گوسفند
گوشت گوسفند سردست آب‌پز|Lamb shoulder, boiled|246|24|0|16.7|سردست گوسفند
گوشت گوسفند سردست کبابی|Lamb shoulder, grilled|255|24.6|0|17.4|سردست گوسفند
گوشت گوسفند سردست سرخ‌شده در تابه|Lamb shoulder, pan-fried|293|24.2|0|21.8|سردست گوسفند
گوشت گوسفند سردست خورشتی (پخته در خورش)|Lamb shoulder, stewed|233|22.3|0|16|سردست گوسفند
گوشت گوسفند گردن خام|Lamb neck, raw|230|17|0|18|
گوشت گوسفند گردن آب‌پز|Lamb neck, boiled|267|23|0|19.4|
گوشت گوسفند گردن کبابی|Lamb neck, grilled|276|23.5|0|20.2|
گوشت گوسفند گردن سرخ‌شده در تابه|Lamb neck, pan-fried|315|23.1|0|24.7|
گوشت گوسفند گردن خورشتی (پخته در خورش)|Lamb neck, stewed|252|21.3|0|18.5|
گوشت گوسفند سینه خام|Lamb breast, raw|292|14.5|0|26|
گوشت گوسفند سینه آب‌پز|Lamb breast, boiled|331|19.6|0|28.1|
گوشت گوسفند سینه کبابی|Lamb breast, grilled|342|20|0|29.1|
گوشت گوسفند سینه سرخ‌شده در تابه|Lamb breast, pan-fried|384|19.7|0|33.9|
گوشت گوسفند سینه خورشتی (پخته در خورش)|Lamb breast, stewed|314|18.1|0|26.8|
گوشت گوسفند ماهیچه خام|Lamb shank, raw|146|19.5|0|7.5|
گوشت گوسفند ماهیچه آب‌پز|Lamb shank, boiled|178|26.3|0|8.1|
گوشت گوسفند ماهیچه کبابی|Lamb shank, grilled|183|26.9|0|8.4|
گوشت گوسفند ماهیچه سرخ‌شده در تابه|Lamb shank, pan-fried|219|26.5|0|12.6|
گوشت گوسفند ماهیچه خورشتی (پخته در خورش)|Lamb shank, stewed|167|24.4|0|7.7|
گوشت گوسفند فیله خام|Lamb tenderloin, raw|141|20.5|0|6.5|
گوشت گوسفند فیله آب‌پز|Lamb tenderloin, boiled|174|27.7|0|7|
گوشت گوسفند فیله کبابی|Lamb tenderloin, grilled|179|28.3|0|7.3|
گوشت گوسفند فیله سرخ‌شده در تابه|Lamb tenderloin, pan-fried|215|27.9|0|11.5|
گوشت گوسفند فیله خورشتی (پخته در خورش)|Lamb tenderloin, stewed|163|25.6|0|6.7|
گوشت گوسفند لخم خام|Lamb lean stewing meat, raw|132|20.5|0|5.5|
گوشت گوسفند لخم آب‌پز|Lamb lean stewing meat, boiled|164|27.7|0|5.9|
گوشت گوسفند لخم کبابی|Lamb lean stewing meat, grilled|169|28.3|0|6.2|
گوشت گوسفند لخم سرخ‌شده در تابه|Lamb lean stewing meat, pan-fried|204|27.9|0|10.3|
گوشت گوسفند لخم خورشتی (پخته در خورش)|Lamb lean stewing meat, stewed|154|25.6|0|5.7|
گوشت چرخ‌کرده گوسفند خام|Ground lamb, raw|277|16.6|0|23.4|
گوشت چرخ‌کرده گوسفند آب‌پز|Ground lamb, boiled|317|22.4|0|25.3|
گوشت چرخ‌کرده گوسفند کبابی|Ground lamb, grilled|327|22.9|0|26.2|
گوشت چرخ‌کرده گوسفند سرخ‌شده در تابه|Ground lamb, pan-fried|369|22.6|0|30.9|
گوشت چرخ‌کرده گوسفند خورشتی (پخته در خورش)|Ground lamb, stewed|300|20.8|0|24.1|
گوشت بره ران خام|Young lamb leg, raw|141|19.5|0|7|
گوشت بره ران آب‌پز|Young lamb leg, boiled|174|26.3|0|7.6|
گوشت بره ران کبابی|Young lamb leg, grilled|178|26.9|0|7.8|
گوشت بره ران سرخ‌شده در تابه|Young lamb leg, pan-fried|214|26.5|0|12|
گوشت بره ران خورشتی (پخته در خورش)|Young lamb leg, stewed|162|24.4|0|7.2|
گوشت بره سینه خام|Young lamb breast, raw|242|15.5|0|20|
گوشت بره سینه آب‌پز|Young lamb breast, boiled|278|20.9|0|21.6|
گوشت بره سینه کبابی|Young lamb breast, grilled|287|21.4|0|22.4|
گوشت بره سینه سرخ‌شده در تابه|Young lamb breast, pan-fried|327|21.1|0|27|
گوشت بره سینه خورشتی (پخته در خورش)|Young lamb breast, stewed|263|19.4|0|20.6|
گوشت بره شانه خام|Young lamb shoulder, raw|182|18.5|0|12|
گوشت بره شانه آب‌پز|Young lamb shoulder, boiled|217|25|0|13|
گوشت بره شانه کبابی|Young lamb shoulder, grilled|223|25.5|0|13.4|
گوشت بره شانه سرخ‌شده در تابه|Young lamb shoulder, pan-fried|261|25.2|0|17.8|
گوشت بره شانه خورشتی (پخته در خورش)|Young lamb shoulder, stewed|204|23.1|0|12.4|
گوشت بز ران خام|Goat leg, raw|104|20.6|0|2.4|
گوشت بز ران آب‌پز|Goat leg, boiled|135|27.8|0|2.6|
گوشت بز ران کبابی|Goat leg, grilled|138|28.4|0|2.7|
گوشت بز ران سرخ‌شده در تابه|Goat leg, pan-fried|173|28|0|6.8|
گوشت بز ران خورشتی (پخته در خورش)|Goat leg, stewed|126|25.8|0|2.5|
گوشت بز سردست خام|Goat shoulder, raw|119|19.5|0|4.5|
گوشت بز سردست آب‌پز|Goat shoulder, boiled|149|26.3|0|4.9|
گوشت بز سردست کبابی|Goat shoulder, grilled|153|26.9|0|5|
گوشت بز سردست سرخ‌شده در تابه|Goat shoulder, pan-fried|189|26.5|0|9.2|
گوشت بز سردست خورشتی (پخته در خورش)|Goat shoulder, stewed|139|24.4|0|4.6|
گوشت بز راسته خام|Goat loin, raw|113|20.3|0|3.5|
گوشت بز راسته آب‌پز|Goat loin, boiled|144|27.4|0|3.8|
گوشت بز راسته کبابی|Goat loin, grilled|147|28|0|3.9|
گوشت بز راسته سرخ‌شده در تابه|Goat loin, pan-fried|182|27.6|0|8|
گوشت بز راسته خورشتی (پخته در خورش)|Goat loin, stewed|134|25.4|0|3.6|
گوشت بز دنده خام|Goat ribs, raw|160|17.5|0|10|
گوشت بز دنده آب‌پز|Goat ribs, boiled|192|23.6|0|10.8|
گوشت بز دنده کبابی|Goat ribs, grilled|197|24.1|0|11.2|
گوشت بز دنده سرخ‌شده در تابه|Goat ribs, pan-fried|235|23.8|0|15.5|
گوشت بز دنده خورشتی (پخته در خورش)|Goat ribs, stewed|180|21.9|0|10.3|
گوشت بز ماهیچه خام|Goat shank, raw|109|20.5|0|3|
گوشت بز ماهیچه آب‌پز|Goat shank, boiled|140|27.7|0|3.2|
گوشت بز ماهیچه کبابی|Goat shank, grilled|144|28.3|0|3.4|
گوشت بز ماهیچه سرخ‌شده در تابه|Goat shank, pan-fried|178|27.9|0|7.4|
گوشت بز ماهیچه خورشتی (پخته در خورش)|Goat shank, stewed|130|25.6|0|3.1|
گوشت بز گردن خام|Goat neck, raw|124|18.5|0|5.5|
گوشت بز گردن آب‌پز|Goat neck, boiled|153|25|0|5.9|
گوشت بز گردن کبابی|Goat neck, grilled|158|25.5|0|6.2|
گوشت بز گردن سرخ‌شده در تابه|Goat neck, pan-fried|194|25.2|0|10.3|
گوشت بز گردن خورشتی (پخته در خورش)|Goat neck, stewed|144|23.1|0|5.7|
گوشت بز سینه خام|Goat breast, raw|174|16.5|0|12|
گوشت بز سینه آب‌پز|Goat breast, boiled|206|22.3|0|13|
گوشت بز سینه کبابی|Goat breast, grilled|212|22.8|0|13.4|
گوشت بز سینه سرخ‌شده در تابه|Goat breast, pan-fried|250|22.4|0|17.8|
گوشت بز سینه خورشتی (پخته در خورش)|Goat breast, stewed|194|20.6|0|12.4|
گوشت چرخ‌کرده بز خام|Ground goat, raw|148|19|0|8|
گوشت چرخ‌کرده بز آب‌پز|Ground goat, boiled|180|25.7|0|8.6|
گوشت چرخ‌کرده بز کبابی|Ground goat, grilled|186|26.2|0|9|
گوشت چرخ‌کرده بز سرخ‌شده در تابه|Ground goat, pan-fried|222|25.8|0|13.2|
گوشت چرخ‌کرده بز خورشتی (پخته در خورش)|Ground goat, stewed|169|23.8|0|8.2|
گوشت بزغاله ران خام|Kid goat leg, raw|108|20.2|0|3|
گوشت بزغاله ران آب‌پز|Kid goat leg, boiled|138|27.3|0|3.2|
گوشت بزغاله ران کبابی|Kid goat leg, grilled|142|27.9|0|3.4|
گوشت بزغاله ران سرخ‌شده در تابه|Kid goat leg, pan-fried|177|27.5|0|7.4|
گوشت بزغاله ران خورشتی (پخته در خورش)|Kid goat leg, stewed|129|25.3|0|3.1|
گوشت بزغاله دنده خام|Kid goat ribs, raw|144|18|0|8|
گوشت بزغاله دنده آب‌پز|Kid goat ribs, boiled|175|24.3|0|8.6|
گوشت بزغاله دنده کبابی|Kid goat ribs, grilled|180|24.8|0|9|
گوشت بزغاله دنده سرخ‌شده در تابه|Kid goat ribs, pan-fried|217|24.5|0|13.2|
گوشت بزغاله دنده خورشتی (پخته در خورش)|Kid goat ribs, stewed|164|22.5|0|8.2|
گوشت شتر ران خام|Camel leg, raw|105|20.5|0|2.5|
گوشت شتر ران آب‌پز|Camel leg, boiled|135|27.7|0|2.7|
گوشت شتر ران کبابی|Camel leg, grilled|138|28.3|0|2.8|
گوشت شتر ران سرخ‌شده در تابه|Camel leg, pan-fried|174|27.9|0|6.9|
گوشت شتر ران خورشتی (پخته در خورش)|Camel leg, stewed|126|25.6|0|2.6|
گوشت شتر راسته خام|Camel loin, raw|109|20|0|3.2|
گوشت شتر راسته آب‌پز|Camel loin, boiled|140|27|0|3.5|
گوشت شتر راسته کبابی|Camel loin, grilled|143|27.6|0|3.6|
گوشت شتر راسته سرخ‌شده در تابه|Camel loin, pan-fried|178|27.2|0|7.7|
گوشت شتر راسته خورشتی (پخته در خورش)|Camel loin, stewed|130|25|0|3.3|
گوشت شتر سردست خام|Camel shoulder, raw|119|19.5|0|4.5|
گوشت شتر سردست آب‌پز|Camel shoulder, boiled|149|26.3|0|4.9|
گوشت شتر سردست کبابی|Camel shoulder, grilled|153|26.9|0|5|
گوشت شتر سردست سرخ‌شده در تابه|Camel shoulder, pan-fried|189|26.5|0|9.2|
گوشت شتر سردست خورشتی (پخته در خورش)|Camel shoulder, stewed|139|24.4|0|4.6|
گوشت شتر سینه خام|Camel brisket, raw|135|18|0|7|
گوشت شتر سینه آب‌پز|Camel brisket, boiled|166|24.3|0|7.6|
گوشت شتر سینه کبابی|Camel brisket, grilled|169|24.8|0|7.8|
گوشت شتر سینه سرخ‌شده در تابه|Camel brisket, pan-fried|206|24.5|0|12|
گوشت شتر سینه خورشتی (پخته در خورش)|Camel brisket, stewed|155|22.5|0|7.2|
گوشت شتر ماهیچه خام|Camel shank, raw|102|21|0|2|
گوشت شتر ماهیچه آب‌پز|Camel shank, boiled|133|28.4|0|2.2|
گوشت شتر ماهیچه کبابی|Camel shank, grilled|136|29|0|2.2|
گوشت شتر ماهیچه سرخ‌شده در تابه|Camel shank, pan-fried|171|28.6|0|6.3|
گوشت شتر ماهیچه خورشتی (پخته در خورش)|Camel shank, stewed|124|26.3|0|2.1|
گوشت شتر چرخ‌کرده خام|Ground camel, raw|130|19|0|6|
گوشت شتر چرخ‌کرده آب‌پز|Ground camel, boiled|161|25.7|0|6.5|
گوشت شتر چرخ‌کرده کبابی|Ground camel, grilled|165|26.2|0|6.7|
گوشت شتر چرخ‌کرده سرخ‌شده در تابه|Ground camel, pan-fried|201|25.8|0|10.9|
گوشت شتر چرخ‌کرده خورشتی (پخته در خورش)|Ground camel, stewed|151|23.8|0|6.2|
گوشت شترمرغ خام|Ostrich meat, raw|105|20.7|0|2.5|
گوشت شترمرغ آب‌پز|Ostrich meat, boiled|136|27.9|0|2.7|
گوشت شترمرغ کبابی|Ostrich meat, grilled|140|28.6|0|2.8|
گوشت شترمرغ سرخ‌شده در تابه|Ostrich meat, pan-fried|175|28.2|0|6.9|
گوشت شترمرغ خورشتی (پخته در خورش)|Ostrich meat, stewed|127|25.9|0|2.6|
گوشت اسب خام|Horse meat, raw|127|21.4|0|4.6|
گوشت اسب آب‌پز|Horse meat, boiled|161|28.9|0|5|
گوشت اسب کبابی|Horse meat, grilled|165|29.5|0|5.2|
گوشت اسب سرخ‌شده در تابه|Horse meat, pan-fried|200|29.1|0|9.3|
گوشت اسب خورشتی (پخته در خورش)|Horse meat, stewed|150|26.8|0|4.7|
گوشت خرگوش اهلی خام|Rabbit, domesticated, raw|130|20.1|0|5.5|
گوشت خرگوش اهلی آب‌پز|Rabbit, domesticated, boiled|162|27.1|0|5.9|
گوشت خرگوش اهلی کبابی|Rabbit, domesticated, grilled|167|27.7|0|6.2|
گوشت خرگوش اهلی سرخ‌شده در تابه|Rabbit, domesticated, pan-fried|202|27.3|0|10.3|
گوشت خرگوش اهلی خورشتی (پخته در خورش)|Rabbit, domesticated, stewed|152|25.1|0|5.7|
گوشت خرگوش وحشی خام|Rabbit, wild, raw|108|21.8|0|2.3|
گوشت خرگوش وحشی آب‌پز|Rabbit, wild, boiled|140|29.4|0|2.5|
گوشت خرگوش وحشی کبابی|Rabbit, wild, grilled|144|30.1|0|2.6|
گوشت خرگوش وحشی سرخ‌شده در تابه|Rabbit, wild, pan-fried|178|29.6|0|6.6|
گوشت خرگوش وحشی خورشتی (پخته در خورش)|Rabbit, wild, stewed|131|27.3|0|2.4|
گوشت گوزن خام|Venison, raw|113|22.9|0|2.4|
گوشت گوزن آب‌پز|Venison, boiled|147|30.9|0|2.6|
گوشت گوزن کبابی|Venison, grilled|151|31.6|0|2.7|
گوشت گوزن سرخ‌شده در تابه|Venison, pan-fried|186|31.1|0|6.8|
گوشت گوزن خورشتی (پخته در خورش)|Venison, stewed|137|28.6|0|2.5|
گوشت آهو خام|Gazelle meat, raw|108|22|0|2.2|
گوشت آهو آب‌پز|Gazelle meat, boiled|140|29.7|0|2.4|
گوشت آهو کبابی|Gazelle meat, grilled|144|30.4|0|2.5|
گوشت آهو سرخ‌شده در تابه|Gazelle meat, pan-fried|178|29.9|0|6.5|
گوشت آهو خورشتی (پخته در خورش)|Gazelle meat, stewed|131|27.5|0|2.3|
گوشت کبک خام|Partridge meat, raw|132|25|0|3.6|
گوشت کبک آب‌پز|Partridge meat, boiled|170|33.8|0|3.9|
گوشت کبک کبابی|Partridge meat, grilled|174|34.5|0|4|
گوشت کبک سرخ‌شده در تابه|Partridge meat, pan-fried|209|34|0|8.1|
گوشت کبک خورشتی (پخته در خورش)|Partridge meat, stewed|159|31.3|0|3.7|
گوشت قرقاول خام|Pheasant meat, raw|178|23.6|0|9.3|
گوشت قرقاول آب‌پز|Pheasant meat, boiled|218|31.9|0|10|
گوشت قرقاول کبابی|Pheasant meat, grilled|224|32.6|0|10.4|
گوشت قرقاول سرخ‌شده در تابه|Pheasant meat, pan-fried|261|32.1|0|14.7|
گوشت قرقاول خورشتی (پخته در خورش)|Pheasant meat, stewed|204|29.5|0|9.6|
گوشت گراز خام|Wild boar, raw|116|21.5|0|3.3|
گوشت گراز آب‌پز|Wild boar, boiled|148|29|0|3.6|
گوشت گراز کبابی|Wild boar, grilled|152|29.7|0|3.7|
گوشت گراز سرخ‌شده در تابه|Wild boar, pan-fried|187|29.2|0|7.8|
گوشت گراز خورشتی (پخته در خورش)|Wild boar, stewed|138|26.9|0|3.4|
سینه مرغ بدون پوست خام|Chicken breast, skinless, raw|113|22.5|0|2.6|فیله مرغ؛سینه مرغ
سینه مرغ بدون پوست آب‌پز|Chicken breast, skinless, boiled|147|30.4|0|2.8|فیله مرغ؛سینه مرغ
سینه مرغ بدون پوست کبابی|Chicken breast, skinless, grilled|150|31|0|2.9|فیله مرغ؛سینه مرغ
سینه مرغ بدون پوست سرخ‌شده در تابه|Chicken breast, skinless, pan-fried|185|30.6|0|7|فیله مرغ؛سینه مرغ
سینه مرغ بدون پوست خورشتی (پخته در خورش)|Chicken breast, skinless, stewed|137|28.1|0|2.7|فیله مرغ؛سینه مرغ
سینه مرغ بدون پوست تنوری|Chicken breast, skinless, oven-roasted|150|31|0|2.9|فیله مرغ؛سینه مرغ
سینه مرغ با پوست خام|Chicken breast, with skin, raw|167|20.9|0|9.3|
سینه مرغ با پوست آب‌پز|Chicken breast, with skin, boiled|203|28.2|0|10|
سینه مرغ با پوست کبابی|Chicken breast, with skin, grilled|209|28.8|0|10.4|
سینه مرغ با پوست سرخ‌شده در تابه|Chicken breast, with skin, pan-fried|246|28.4|0|14.7|
سینه مرغ با پوست خورشتی (پخته در خورش)|Chicken breast, with skin, stewed|191|26.1|0|9.6|
سینه مرغ با پوست تنوری|Chicken breast, with skin, oven-roasted|207|28.8|0|10.2|
ران مرغ بدون پوست خام|Chicken thigh, skinless, raw|124|19.7|0|5|
ران مرغ بدون پوست آب‌پز|Chicken thigh, skinless, boiled|155|26.6|0|5.4|
ران مرغ بدون پوست کبابی|Chicken thigh, skinless, grilled|159|27.2|0|5.6|
ران مرغ بدون پوست سرخ‌شده در تابه|Chicken thigh, skinless, pan-fried|195|26.8|0|9.8|
ران مرغ بدون پوست خورشتی (پخته در خورش)|Chicken thigh, skinless, stewed|145|24.6|0|5.2|
ران مرغ بدون پوست تنوری|Chicken thigh, skinless, oven-roasted|158|27.2|0|5.5|
ران مرغ با پوست خام|Chicken thigh, with skin, raw|168|17.3|0|11|
ران مرغ با پوست آب‌پز|Chicken thigh, with skin, boiled|201|23.4|0|11.9|
ران مرغ با پوست کبابی|Chicken thigh, with skin, grilled|206|23.9|0|12.3|
ران مرغ با پوست سرخ‌شده در تابه|Chicken thigh, with skin, pan-fried|243|23.5|0|16.6|
ران مرغ با پوست خورشتی (پخته در خورش)|Chicken thigh, with skin, stewed|188|21.6|0|11.3|
ران مرغ با پوست تنوری|Chicken thigh, with skin, oven-roasted|205|23.9|0|12.1|
ساق مرغ بدون پوست خام|Chicken drumstick, skinless, raw|114|19.5|0|4|
ساق مرغ بدون پوست آب‌پز|Chicken drumstick, skinless, boiled|144|26.3|0|4.3|
ساق مرغ بدون پوست کبابی|Chicken drumstick, skinless, grilled|148|26.9|0|4.5|
ساق مرغ بدون پوست سرخ‌شده در تابه|Chicken drumstick, skinless, pan-fried|183|26.5|0|8.6|
ساق مرغ بدون پوست خورشتی (پخته در خورش)|Chicken drumstick, skinless, stewed|135|24.4|0|4.1|
ساق مرغ بدون پوست تنوری|Chicken drumstick, skinless, oven-roasted|147|26.9|0|4.4|
ساق مرغ با پوست خام|Chicken drumstick, with skin, raw|159|17.8|0|9.7|
ساق مرغ با پوست آب‌پز|Chicken drumstick, with skin, boiled|191|24|0|10.5|
ساق مرغ با پوست کبابی|Chicken drumstick, with skin, grilled|197|24.6|0|10.9|
ساق مرغ با پوست سرخ‌شده در تابه|Chicken drumstick, with skin, pan-fried|234|24.2|0|15.2|
ساق مرغ با پوست خورشتی (پخته در خورش)|Chicken drumstick, with skin, stewed|179|22.3|0|10|
ساق مرغ با پوست تنوری|Chicken drumstick, with skin, oven-roasted|195|24.6|0|10.7|
ران کامل مرغ بدون پوست خام|Chicken leg quarter, skinless, raw|121|19.9|0|4.6|
ران کامل مرغ بدون پوست آب‌پز|Chicken leg quarter, skinless, boiled|153|26.9|0|5|
ران کامل مرغ بدون پوست کبابی|Chicken leg quarter, skinless, grilled|157|27.5|0|5.2|
ران کامل مرغ بدون پوست سرخ‌شده در تابه|Chicken leg quarter, skinless, pan-fried|192|27.1|0|9.3|
ران کامل مرغ بدون پوست خورشتی (پخته در خورش)|Chicken leg quarter, skinless, stewed|142|24.9|0|4.7|
ران کامل مرغ بدون پوست تنوری|Chicken leg quarter, skinless, oven-roasted|156|27.5|0|5.1|
ران کامل مرغ با پوست خام|Chicken leg quarter, with skin, raw|171|18|0|11|
ران کامل مرغ با پوست آب‌پز|Chicken leg quarter, with skin, boiled|204|24.3|0|11.9|
ران کامل مرغ با پوست کبابی|Chicken leg quarter, with skin, grilled|210|24.8|0|12.3|
ران کامل مرغ با پوست سرخ‌شده در تابه|Chicken leg quarter, with skin, pan-fried|247|24.5|0|16.6|
ران کامل مرغ با پوست خورشتی (پخته در خورش)|Chicken leg quarter, with skin, stewed|192|22.5|0|11.3|
ران کامل مرغ با پوست تنوری|Chicken leg quarter, with skin, oven-roasted|208|24.8|0|12.1|
بال مرغ با پوست خام|Chicken wing, with skin, raw|201|17.5|0|14.5|
بال مرغ با پوست آب‌پز|Chicken wing, with skin, boiled|236|23.6|0|15.7|
بال مرغ با پوست کبابی|Chicken wing, with skin, grilled|242|24.1|0|16.2|
بال مرغ با پوست سرخ‌شده در تابه|Chicken wing, with skin, pan-fried|282|23.8|0|20.7|
بال مرغ با پوست خورشتی (پخته در خورش)|Chicken wing, with skin, stewed|222|21.9|0|14.9|
بال مرغ با پوست تنوری|Chicken wing, with skin, oven-roasted|240|24.1|0|16|
بال مرغ بدون پوست خام|Chicken wing, skinless, raw|135|20.3|0|6|
بال مرغ بدون پوست آب‌پز|Chicken wing, skinless, boiled|168|27.4|0|6.5|
بال مرغ بدون پوست کبابی|Chicken wing, skinless, grilled|172|28|0|6.7|
بال مرغ بدون پوست سرخ‌شده در تابه|Chicken wing, skinless, pan-fried|209|27.6|0|10.9|
بال مرغ بدون پوست خورشتی (پخته در خورش)|Chicken wing, skinless, stewed|157|25.4|0|6.2|
بال مرغ بدون پوست تنوری|Chicken wing, skinless, oven-roasted|171|28|0|6.6|
مرغ کامل با پوست خام|Whole chicken, with skin, raw|209|18.6|0|15|
مرغ کامل با پوست آب‌پز|Whole chicken, with skin, boiled|246|25.1|0|16.2|
مرغ کامل با پوست کبابی|Whole chicken, with skin, grilled|254|25.7|0|16.8|
مرغ کامل با پوست سرخ‌شده در تابه|Whole chicken, with skin, pan-fried|293|25.3|0|21.3|
مرغ کامل با پوست خورشتی (پخته در خورش)|Whole chicken, with skin, stewed|233|23.3|0|15.5|
مرغ کامل با پوست تنوری|Whole chicken, with skin, oven-roasted|251|25.7|0|16.5|
مرغ کامل بدون پوست خام|Whole chicken, skinless, raw|124|20.3|0|4.7|
مرغ کامل بدون پوست آب‌پز|Whole chicken, skinless, boiled|156|27.4|0|5.1|
مرغ کامل بدون پوست کبابی|Whole chicken, skinless, grilled|160|28|0|5.3|
مرغ کامل بدون پوست سرخ‌شده در تابه|Whole chicken, skinless, pan-fried|195|27.6|0|9.4|
مرغ کامل بدون پوست خورشتی (پخته در خورش)|Whole chicken, skinless, stewed|145|25.4|0|4.8|
مرغ کامل بدون پوست تنوری|Whole chicken, skinless, oven-roasted|159|28|0|5.2|
پشت مرغ با پوست خام|Chicken back, with skin, raw|245|14.1|0|21|
پشت مرغ با پوست آب‌پز|Chicken back, with skin, boiled|280|19|0|22.7|
پشت مرغ با پوست کبابی|Chicken back, with skin, grilled|290|19.5|0|23.5|
پشت مرغ با پوست سرخ‌شده در تابه|Chicken back, with skin, pan-fried|330|19.2|0|28.1|
پشت مرغ با پوست خورشتی (پخته در خورش)|Chicken back, with skin, stewed|265|17.6|0|21.6|
پشت مرغ با پوست تنوری|Chicken back, with skin, oven-roasted|286|19.5|0|23.1|
گردن مرغ با پوست خام|Chicken neck, with skin, raw|245|14.1|0|21|
گردن مرغ با پوست آب‌پز|Chicken neck, with skin, boiled|280|19|0|22.7|
گردن مرغ با پوست کبابی|Chicken neck, with skin, grilled|290|19.5|0|23.5|
گردن مرغ با پوست سرخ‌شده در تابه|Chicken neck, with skin, pan-fried|330|19.2|0|28.1|
گردن مرغ با پوست خورشتی (پخته در خورش)|Chicken neck, with skin, stewed|265|17.6|0|21.6|
گردن مرغ با پوست تنوری|Chicken neck, with skin, oven-roasted|286|19.5|0|23.1|
گردن مرغ بدون پوست خام|Chicken neck, skinless, raw|140|17|0|8|
گردن مرغ بدون پوست آب‌پز|Chicken neck, skinless, boiled|169|23|0|8.6|
گردن مرغ بدون پوست کبابی|Chicken neck, skinless, grilled|175|23.5|0|9|
گردن مرغ بدون پوست سرخ‌شده در تابه|Chicken neck, skinless, pan-fried|211|23.1|0|13.2|
گردن مرغ بدون پوست خورشتی (پخته در خورش)|Chicken neck, skinless, stewed|159|21.3|0|8.2|
گردن مرغ بدون پوست تنوری|Chicken neck, skinless, oven-roasted|173|23.5|0|8.8|
فیله مرغ (تندرلوین) خام|Chicken tenderloin, raw|104|22|0|1.8|
فیله مرغ (تندرلوین) آب‌پز|Chicken tenderloin, boiled|136|29.7|0|1.9|
فیله مرغ (تندرلوین) کبابی|Chicken tenderloin, grilled|140|30.4|0|2|
فیله مرغ (تندرلوین) سرخ‌شده در تابه|Chicken tenderloin, pan-fried|175|29.9|0|6.1|
فیله مرغ (تندرلوین) خورشتی (پخته در خورش)|Chicken tenderloin, stewed|127|27.5|0|1.9|
فیله مرغ (تندرلوین) تنوری|Chicken tenderloin, oven-roasted|140|30.4|0|2|
پوست مرغ خام|Chicken skin, raw|345|13.3|0|32.4|
پوست مرغ آب‌پز|Chicken skin, boiled|387|18|0|35|
پوست مرغ کبابی|Chicken skin, grilled|400|18.4|0|36.3|
پوست مرغ سرخ‌شده در تابه|Chicken skin, pan-fried|444|18.1|0|41.3|
پوست مرغ خورشتی (پخته در خورش)|Chicken skin, stewed|367|16.6|0|33.4|
پوست مرغ تنوری|Chicken skin, oven-roasted|394|18.4|0|35.6|
پای مرغ خام|Chicken feet, raw|209|19.4|0|14.6|پنجه مرغ
پای مرغ آب‌پز|Chicken feet, boiled|247|26.2|0|15.8|پنجه مرغ
پای مرغ کبابی|Chicken feet, grilled|255|26.8|0|16.4|پنجه مرغ
پای مرغ سرخ‌شده در تابه|Chicken feet, pan-fried|293|26.4|0|20.8|پنجه مرغ
پای مرغ خورشتی (پخته در خورش)|Chicken feet, stewed|232|24.3|0|15|پنجه مرغ
پای مرغ تنوری|Chicken feet, oven-roasted|252|26.8|0|16.1|پنجه مرغ
مرغ چرخ‌کرده خام|Ground chicken, raw|143|17.4|0|8.1|
مرغ چرخ‌کرده آب‌پز|Ground chicken, boiled|172|23.5|0|8.7|
مرغ چرخ‌کرده کبابی|Ground chicken, grilled|178|24|0|9.1|
مرغ چرخ‌کرده سرخ‌شده در تابه|Ground chicken, pan-fried|215|23.7|0|13.3|
مرغ چرخ‌کرده خورشتی (پخته در خورش)|Ground chicken, stewed|162|21.8|0|8.3|
مرغ چرخ‌کرده تنوری|Ground chicken, oven-roasted|176|24|0|8.9|
مرغ چرخ‌کرده کم‌چرب خام|Ground chicken, lean, raw|112|20|0|3.5|
مرغ چرخ‌کرده کم‌چرب آب‌پز|Ground chicken, lean, boiled|142|27|0|3.8|
مرغ چرخ‌کرده کم‌چرب کبابی|Ground chicken, lean, grilled|146|27.6|0|3.9|
مرغ چرخ‌کرده کم‌چرب سرخ‌شده در تابه|Ground chicken, lean, pan-fried|181|27.2|0|8|
مرغ چرخ‌کرده کم‌چرب خورشتی (پخته در خورش)|Ground chicken, lean, stewed|132|25|0|3.6|
مرغ چرخ‌کرده کم‌چرب تنوری|Ground chicken, lean, oven-roasted|146|27.6|0|3.9|
مرغ جوان (جوجه) کامل خام|Young chicken (poussin), whole, raw|173|18.5|0|11|
مرغ جوان (جوجه) کامل آب‌پز|Young chicken (poussin), whole, boiled|207|25|0|11.9|
مرغ جوان (جوجه) کامل کبابی|Young chicken (poussin), whole, grilled|213|25.5|0|12.3|
مرغ جوان (جوجه) کامل سرخ‌شده در تابه|Young chicken (poussin), whole, pan-fried|250|25.2|0|16.6|
مرغ جوان (جوجه) کامل خورشتی (پخته در خورش)|Young chicken (poussin), whole, stewed|194|23.1|0|11.3|
مرغ جوان (جوجه) کامل تنوری|Young chicken (poussin), whole, oven-roasted|211|25.5|0|12.1|
مرغ سینه کلفت ماکیان (بروئیلر) کامل خام|Broiler chicken, whole, raw|182|18.6|0|12|
مرغ سینه کلفت ماکیان (بروئیلر) کامل آب‌پز|Broiler chicken, whole, boiled|217|25.1|0|13|
مرغ سینه کلفت ماکیان (بروئیلر) کامل کبابی|Broiler chicken, whole, grilled|223|25.7|0|13.4|
مرغ سینه کلفت ماکیان (بروئیلر) کامل سرخ‌شده در تابه|Broiler chicken, whole, pan-fried|261|25.3|0|17.8|
مرغ سینه کلفت ماکیان (بروئیلر) کامل خورشتی (پخته در خورش)|Broiler chicken, whole, stewed|205|23.3|0|12.4|
مرغ سینه کلفت ماکیان (بروئیلر) کامل تنوری|Broiler chicken, whole, oven-roasted|222|25.7|0|13.2|
مرغ محلی (روستایی) کامل خام|Free-range chicken, whole, raw|152|20|0|8|
مرغ محلی (روستایی) کامل آب‌پز|Free-range chicken, whole, boiled|185|27|0|8.6|
مرغ محلی (روستایی) کامل کبابی|Free-range chicken, whole, grilled|191|27.6|0|9|
مرغ محلی (روستایی) کامل سرخ‌شده در تابه|Free-range chicken, whole, pan-fried|228|27.2|0|13.2|
مرغ محلی (روستایی) کامل خورشتی (پخته در خورش)|Free-range chicken, whole, stewed|174|25|0|8.2|
مرغ محلی (روستایی) کامل تنوری|Free-range chicken, whole, oven-roasted|190|27.6|0|8.8|
خروس کامل خام|Rooster, whole, raw|163|20.5|0|9|
خروس کامل آب‌پز|Rooster, whole, boiled|198|27.7|0|9.7|
خروس کامل کبابی|Rooster, whole, grilled|204|28.3|0|10.1|
خروس کامل سرخ‌شده در تابه|Rooster, whole, pan-fried|240|27.9|0|14.3|
خروس کامل خورشتی (پخته در خورش)|Rooster, whole, stewed|186|25.6|0|9.3|
خروس کامل تنوری|Rooster, whole, oven-roasted|202|28.3|0|9.9|
سینه بوقلمون بدون پوست خام|Turkey breast, skinless, raw|108|23.7|0|1.5|
سینه بوقلمون بدون پوست آب‌پز|Turkey breast, skinless, boiled|142|32|0|1.6|
سینه بوقلمون بدون پوست کبابی|Turkey breast, skinless, grilled|146|32.7|0|1.7|
سینه بوقلمون بدون پوست سرخ‌شده در تابه|Turkey breast, skinless, pan-fried|180|32.2|0|5.7|
سینه بوقلمون بدون پوست خورشتی (پخته در خورش)|Turkey breast, skinless, stewed|132|29.6|0|1.5|
سینه بوقلمون بدون پوست تنوری|Turkey breast, skinless, oven-roasted|146|32.7|0|1.7|
سینه بوقلمون با پوست خام|Turkey breast, with skin, raw|137|21.7|0|5.6|
سینه بوقلمون با پوست آب‌پز|Turkey breast, with skin, boiled|171|29.3|0|6|
سینه بوقلمون با پوست کبابی|Turkey breast, with skin, grilled|176|29.9|0|6.3|
سینه بوقلمون با پوست سرخ‌شده در تابه|Turkey breast, with skin, pan-fried|212|29.5|0|10.4|
سینه بوقلمون با پوست خورشتی (پخته در خورش)|Turkey breast, with skin, stewed|161|27.1|0|5.8|
سینه بوقلمون با پوست تنوری|Turkey breast, with skin, oven-roasted|175|29.9|0|6.2|
ران بوقلمون بدون پوست خام|Turkey thigh, skinless, raw|132|19.5|0|6|
ران بوقلمون بدون پوست آب‌پز|Turkey thigh, skinless, boiled|164|26.3|0|6.5|
ران بوقلمون بدون پوست کبابی|Turkey thigh, skinless, grilled|168|26.9|0|6.7|
ران بوقلمون بدون پوست سرخ‌شده در تابه|Turkey thigh, skinless, pan-fried|204|26.5|0|10.9|
ران بوقلمون بدون پوست خورشتی (پخته در خورش)|Turkey thigh, skinless, stewed|153|24.4|0|6.2|
ران بوقلمون بدون پوست تنوری|Turkey thigh, skinless, oven-roasted|167|26.9|0|6.6|
ران بوقلمون با پوست خام|Turkey thigh, with skin, raw|160|17.5|0|10|
ران بوقلمون با پوست آب‌پز|Turkey thigh, with skin, boiled|192|23.6|0|10.8|
ران بوقلمون با پوست کبابی|Turkey thigh, with skin, grilled|197|24.1|0|11.2|
ران بوقلمون با پوست سرخ‌شده در تابه|Turkey thigh, with skin, pan-fried|235|23.8|0|15.5|
ران بوقلمون با پوست خورشتی (پخته در خورش)|Turkey thigh, with skin, stewed|180|21.9|0|10.3|
ران بوقلمون با پوست تنوری|Turkey thigh, with skin, oven-roasted|195|24.1|0|11|
ساق بوقلمون بدون پوست خام|Turkey drumstick, skinless, raw|121|20|0|4.5|
ساق بوقلمون بدون پوست آب‌پز|Turkey drumstick, skinless, boiled|152|27|0|4.9|
ساق بوقلمون بدون پوست کبابی|Turkey drumstick, skinless, grilled|155|27.6|0|5|
ساق بوقلمون بدون پوست سرخ‌شده در تابه|Turkey drumstick, skinless, pan-fried|192|27.2|0|9.2|
ساق بوقلمون بدون پوست خورشتی (پخته در خورش)|Turkey drumstick, skinless, stewed|141|25|0|4.6|
ساق بوقلمون بدون پوست تنوری|Turkey drumstick, skinless, oven-roasted|155|27.6|0|5|
ساق بوقلمون با پوست خام|Turkey drumstick, with skin, raw|149|18|0|8.5|
ساق بوقلمون با پوست آب‌پز|Turkey drumstick, with skin, boiled|180|24.3|0|9.2|
ساق بوقلمون با پوست کبابی|Turkey drumstick, with skin, grilled|185|24.8|0|9.5|
ساق بوقلمون با پوست سرخ‌شده در تابه|Turkey drumstick, with skin, pan-fried|222|24.5|0|13.8|
ساق بوقلمون با پوست خورشتی (پخته در خورش)|Turkey drumstick, with skin, stewed|169|22.5|0|8.8|
ساق بوقلمون با پوست تنوری|Turkey drumstick, with skin, oven-roasted|184|24.8|0|9.4|
بال بوقلمون خام|Turkey wing, raw|155|18.5|0|9|
بال بوقلمون آب‌پز|Turkey wing, boiled|187|25|0|9.7|
بال بوقلمون کبابی|Turkey wing, grilled|193|25.5|0|10.1|
بال بوقلمون سرخ‌شده در تابه|Turkey wing, pan-fried|230|25.2|0|14.3|
بال بوقلمون خورشتی (پخته در خورش)|Turkey wing, stewed|176|23.1|0|9.3|
بال بوقلمون تنوری|Turkey wing, oven-roasted|191|25.5|0|9.9|
بوقلمون کامل با پوست خام|Whole turkey, with skin, raw|153|20.4|0|7.9|
بوقلمون کامل با پوست آب‌پز|Whole turkey, with skin, boiled|187|27.5|0|8.5|
بوقلمون کامل با پوست کبابی|Whole turkey, with skin, grilled|192|28.2|0|8.8|
بوقلمون کامل با پوست سرخ‌شده در تابه|Whole turkey, with skin, pan-fried|229|27.7|0|13.1|
بوقلمون کامل با پوست خورشتی (پخته در خورش)|Whole turkey, with skin, stewed|175|25.5|0|8.1|
بوقلمون کامل با پوست تنوری|Whole turkey, with skin, oven-roasted|191|28.2|0|8.7|
بوقلمون کامل بدون پوست خام|Whole turkey, skinless, raw|118|21.5|0|3.5|
بوقلمون کامل بدون پوست آب‌پز|Whole turkey, skinless, boiled|150|29|0|3.8|
بوقلمون کامل بدون پوست کبابی|Whole turkey, skinless, grilled|154|29.7|0|3.9|
بوقلمون کامل بدون پوست سرخ‌شده در تابه|Whole turkey, skinless, pan-fried|189|29.2|0|8|
بوقلمون کامل بدون پوست خورشتی (پخته در خورش)|Whole turkey, skinless, stewed|140|26.9|0|3.6|
بوقلمون کامل بدون پوست تنوری|Whole turkey, skinless, oven-roasted|154|29.7|0|3.9|
بوقلمون چرخ‌کرده خام|Ground turkey, raw|150|18.7|0|8.3|
بوقلمون چرخ‌کرده آب‌پز|Ground turkey, boiled|182|25.2|0|9|
بوقلمون چرخ‌کرده کبابی|Ground turkey, grilled|187|25.8|0|9.3|
بوقلمون چرخ‌کرده سرخ‌شده در تابه|Ground turkey, pan-fried|223|25.4|0|13.5|
بوقلمون چرخ‌کرده خورشتی (پخته در خورش)|Ground turkey, stewed|170|23.4|0|8.5|
بوقلمون چرخ‌کرده تنوری|Ground turkey, oven-roasted|185|25.8|0|9.1|
بوقلمون چرخ‌کرده 99 درصد بدون چربی خام|Ground turkey 99% lean, raw|97|22|0|1|
بوقلمون چرخ‌کرده 99 درصد بدون چربی آب‌پز|Ground turkey 99% lean, boiled|129|29.7|0|1.1|
بوقلمون چرخ‌کرده 99 درصد بدون چربی کبابی|Ground turkey 99% lean, grilled|132|30.4|0|1.1|
بوقلمون چرخ‌کرده 99 درصد بدون چربی سرخ‌شده در تابه|Ground turkey 99% lean, pan-fried|166|29.9|0|5.2|
بوقلمون چرخ‌کرده 99 درصد بدون چربی خورشتی (پخته در خورش)|Ground turkey 99% lean, stewed|119|27.5|0|1|
بوقلمون چرخ‌کرده 99 درصد بدون چربی تنوری|Ground turkey 99% lean, oven-roasted|132|30.4|0|1.1|
گردن بوقلمون خام|Turkey neck, raw|135|18|0|7|
گردن بوقلمون آب‌پز|Turkey neck, boiled|166|24.3|0|7.6|
گردن بوقلمون کبابی|Turkey neck, grilled|169|24.8|0|7.8|
گردن بوقلمون سرخ‌شده در تابه|Turkey neck, pan-fried|206|24.5|0|12|
گردن بوقلمون خورشتی (پخته در خورش)|Turkey neck, stewed|155|22.5|0|7.2|
گردن بوقلمون تنوری|Turkey neck, oven-roasted|169|24.8|0|7.7|
پوست بوقلمون خام|Turkey skin, raw|326|14|0|30|
پوست بوقلمون آب‌پز|Turkey skin, boiled|367|18.9|0|32.4|
پوست بوقلمون کبابی|Turkey skin, grilled|380|19.3|0|33.6|
پوست بوقلمون سرخ‌شده در تابه|Turkey skin, pan-fried|423|19|0|38.5|
پوست بوقلمون خورشتی (پخته در خورش)|Turkey skin, stewed|348|17.5|0|30.9|
پوست بوقلمون تنوری|Turkey skin, oven-roasted|374|19.3|0|33|
اردک با پوست خام|Duck, meat and skin, raw|302|11.5|0|28.4|
اردک با پوست آب‌پز|Duck, meat and skin, boiled|338|15.5|0|30.7|
اردک با پوست کبابی|Duck, meat and skin, grilled|350|15.9|0|31.8|
اردک با پوست سرخ‌شده در تابه|Duck, meat and skin, pan-fried|393|15.6|0|36.7|
اردک با پوست خورشتی (پخته در خورش)|Duck, meat and skin, stewed|321|14.4|0|29.3|
اردک با پوست تنوری|Duck, meat and skin, oven-roasted|344|15.9|0|31.2|
اردک بدون پوست خام|Duck, meat only, raw|116|19.5|0|4.2|
اردک بدون پوست آب‌پز|Duck, meat only, boiled|146|26.3|0|4.5|
اردک بدون پوست کبابی|Duck, meat only, grilled|150|26.9|0|4.7|
اردک بدون پوست سرخ‌شده در تابه|Duck, meat only, pan-fried|185|26.5|0|8.8|
اردک بدون پوست خورشتی (پخته در خورش)|Duck, meat only, stewed|136|24.4|0|4.3|
اردک بدون پوست تنوری|Duck, meat only, oven-roasted|149|26.9|0|4.6|
سینه اردک با پوست خام|Duck breast, with skin, raw|230|12.5|0|20|
سینه اردک با پوست آب‌پز|Duck breast, with skin, boiled|262|16.9|0|21.6|
سینه اردک با پوست کبابی|Duck breast, with skin, grilled|271|17.3|0|22.4|
سینه اردک با پوست سرخ‌شده در تابه|Duck breast, with skin, pan-fried|311|17|0|27|
سینه اردک با پوست خورشتی (پخته در خورش)|Duck breast, with skin, stewed|248|15.6|0|20.6|
سینه اردک با پوست تنوری|Duck breast, with skin, oven-roasted|267|17.3|0|22|
سینه اردک بدون پوست خام|Duck breast, skinless, raw|97|19.8|0|2|
سینه اردک بدون پوست آب‌پز|Duck breast, skinless, boiled|127|26.7|0|2.2|
سینه اردک بدون پوست کبابی|Duck breast, skinless, grilled|129|27.3|0|2.2|
سینه اردک بدون پوست سرخ‌شده در تابه|Duck breast, skinless, pan-fried|164|26.9|0|6.3|
سینه اردک بدون پوست خورشتی (پخته در خورش)|Duck breast, skinless, stewed|118|24.8|0|2.1|
سینه اردک بدون پوست تنوری|Duck breast, skinless, oven-roasted|129|27.3|0|2.2|
ران اردک با پوست خام|Duck leg, with skin, raw|240|15|0|20|
ران اردک با پوست آب‌پز|Duck leg, with skin, boiled|276|20.3|0|21.6|
ران اردک با پوست کبابی|Duck leg, with skin, grilled|284|20.7|0|22.4|
ران اردک با پوست سرخ‌شده در تابه|Duck leg, with skin, pan-fried|325|20.4|0|27|
ران اردک با پوست خورشتی (پخته در خورش)|Duck leg, with skin, stewed|261|18.8|0|20.6|
ران اردک با پوست تنوری|Duck leg, with skin, oven-roasted|281|20.7|0|22|
ران اردک بدون پوست خام|Duck leg, skinless, raw|121|19|0|5|
ران اردک بدون پوست آب‌پز|Duck leg, skinless, boiled|151|25.7|0|5.4|
ران اردک بدون پوست کبابی|Duck leg, skinless, grilled|155|26.2|0|5.6|
ران اردک بدون پوست سرخ‌شده در تابه|Duck leg, skinless, pan-fried|191|25.8|0|9.8|
ران اردک بدون پوست خورشتی (پخته در خورش)|Duck leg, skinless, stewed|142|23.8|0|5.2|
ران اردک بدون پوست تنوری|Duck leg, skinless, oven-roasted|154|26.2|0|5.5|
پوست اردک خام|Duck skin, raw|580|10|0|60|
پوست اردک آب‌پز|Duck skin, boiled|637|13.5|0|64.8|
پوست اردک کبابی|Duck skin, grilled|660|13.8|0|67.2|
پوست اردک سرخ‌شده در تابه|Duck skin, pan-fried|711|13.6|0|73|
پوست اردک خورشتی (پخته در خورش)|Duck skin, stewed|606|12.5|0|61.8|
پوست اردک تنوری|Duck skin, oven-roasted|649|13.8|0|66|
بال اردک خام|Duck wing, raw|254|14|0|22|
بال اردک آب‌پز|Duck wing, boiled|290|18.9|0|23.8|
بال اردک کبابی|Duck wing, grilled|299|19.3|0|24.6|
بال اردک سرخ‌شده در تابه|Duck wing, pan-fried|340|19|0|29.3|
بال اردک خورشتی (پخته در خورش)|Duck wing, stewed|274|17.5|0|22.7|
بال اردک تنوری|Duck wing, oven-roasted|295|19.3|0|24.2|
غاز با پوست خام|Goose, meat and skin, raw|262|16.1|0|21.9|
غاز با پوست آب‌پز|Goose, meat and skin, boiled|300|21.7|0|23.7|
غاز با پوست کبابی|Goose, meat and skin, grilled|309|22.2|0|24.5|
غاز با پوست سرخ‌شده در تابه|Goose, meat and skin, pan-fried|350|21.9|0|29.2|
غاز با پوست خورشتی (پخته در خورش)|Goose, meat and skin, stewed|284|20.1|0|22.6|
غاز با پوست تنوری|Goose, meat and skin, oven-roasted|306|22.2|0|24.1|
غاز بدون پوست خام|Goose, meat only, raw|155|22.8|0|7.1|
غاز بدون پوست آب‌پز|Goose, meat only, boiled|193|30.8|0|7.7|
غاز بدون پوست کبابی|Goose, meat only, grilled|198|31.5|0|8|
غاز بدون پوست سرخ‌شده در تابه|Goose, meat only, pan-fried|234|31|0|12.2|
غاز بدون پوست خورشتی (پخته در خورش)|Goose, meat only, stewed|180|28.5|0|7.3|
غاز بدون پوست تنوری|Goose, meat only, oven-roasted|196|31.5|0|7.8|
سینه غاز خام|Goose breast, raw|142|22|0|6|
سینه غاز آب‌پز|Goose breast, boiled|177|29.7|0|6.5|
سینه غاز کبابی|Goose breast, grilled|182|30.4|0|6.7|
سینه غاز سرخ‌شده در تابه|Goose breast, pan-fried|218|29.9|0|10.9|
سینه غاز خورشتی (پخته در خورش)|Goose breast, stewed|166|27.5|0|6.2|
سینه غاز تنوری|Goose breast, oven-roasted|181|30.4|0|6.6|
ران غاز خام|Goose leg, raw|184|19|0|12|
ران غاز آب‌پز|Goose leg, boiled|220|25.7|0|13|
ران غاز کبابی|Goose leg, grilled|225|26.2|0|13.4|
ران غاز سرخ‌شده در تابه|Goose leg, pan-fried|263|25.8|0|17.8|
ران غاز خورشتی (پخته در خورش)|Goose leg, stewed|207|23.8|0|12.4|
ران غاز تنوری|Goose leg, oven-roasted|224|26.2|0|13.2|
بلدرچین با پوست خام|Quail, meat and skin, raw|196|21.8|0|12.1|
بلدرچین با پوست آب‌پز|Quail, meat and skin, boiled|236|29.4|0|13.1|
بلدرچین با پوست کبابی|Quail, meat and skin, grilled|243|30.1|0|13.6|
بلدرچین با پوست سرخ‌شده در تابه|Quail, meat and skin, pan-fried|280|29.6|0|17.9|
بلدرچین با پوست خورشتی (پخته در خورش)|Quail, meat and skin, stewed|222|27.3|0|12.5|
بلدرچین با پوست تنوری|Quail, meat and skin, oven-roasted|240|30.1|0|13.3|
بلدرچین بدون پوست خام|Quail, meat only, raw|131|22.6|0|4.5|
بلدرچین بدون پوست آب‌پز|Quail, meat only, boiled|166|30.5|0|4.9|
بلدرچین بدون پوست کبابی|Quail, meat only, grilled|170|31.2|0|5|
بلدرچین بدون پوست سرخ‌شده در تابه|Quail, meat only, pan-fried|206|30.7|0|9.2|
بلدرچین بدون پوست خورشتی (پخته در خورش)|Quail, meat only, stewed|155|28.3|0|4.6|
بلدرچین بدون پوست تنوری|Quail, meat only, oven-roasted|170|31.2|0|5|
سینه بلدرچین خام|Quail breast, raw|119|23|0|3|
سینه بلدرچین آب‌پز|Quail breast, boiled|153|31.1|0|3.2|
سینه بلدرچین کبابی|Quail breast, grilled|157|31.7|0|3.4|
سینه بلدرچین سرخ‌شده در تابه|Quail breast, pan-fried|192|31.3|0|7.4|
سینه بلدرچین خورشتی (پخته در خورش)|Quail breast, stewed|143|28.8|0|3.1|
سینه بلدرچین تنوری|Quail breast, oven-roasted|157|31.7|0|3.3|
ران بلدرچین خام|Quail thigh, raw|134|20|0|6|
ران بلدرچین آب‌پز|Quail thigh, boiled|167|27|0|6.5|
ران بلدرچین کبابی|Quail thigh, grilled|171|27.6|0|6.7|
ران بلدرچین سرخ‌شده در تابه|Quail thigh, pan-fried|207|27.2|0|10.9|
ران بلدرچین خورشتی (پخته در خورش)|Quail thigh, stewed|156|25|0|6.2|
ران بلدرچین تنوری|Quail thigh, oven-roasted|170|27.6|0|6.6|
کبوتر با پوست خام|Pigeon, meat and skin, raw|284|17.5|0|23.8|
کبوتر با پوست آب‌پز|Pigeon, meat and skin, boiled|326|23.6|0|25.7|
کبوتر با پوست کبابی|Pigeon, meat and skin, grilled|337|24.1|0|26.7|
کبوتر با پوست سرخ‌شده در تابه|Pigeon, meat and skin, pan-fried|378|23.8|0|31.4|
کبوتر با پوست خورشتی (پخته در خورش)|Pigeon, meat and skin, stewed|308|21.9|0|24.5|
کبوتر با پوست تنوری|Pigeon, meat and skin, oven-roasted|332|24.1|0|26.2|
کبوتر بدون پوست خام|Pigeon, meat only, raw|152|21|0|7.5|
کبوتر بدون پوست آب‌پز|Pigeon, meat only, boiled|187|28.4|0|8.1|
کبوتر بدون پوست کبابی|Pigeon, meat only, grilled|192|29|0|8.4|
کبوتر بدون پوست سرخ‌شده در تابه|Pigeon, meat only, pan-fried|228|28.6|0|12.6|
کبوتر بدون پوست خورشتی (پخته در خورش)|Pigeon, meat only, stewed|175|26.3|0|7.7|
کبوتر بدون پوست تنوری|Pigeon, meat only, oven-roasted|191|29|0|8.3|
قمری خام|Turtle dove meat, raw|129|22|0|4.5|
قمری آب‌پز|Turtle dove meat, boiled|163|29.7|0|4.9|
قمری کبابی|Turtle dove meat, grilled|167|30.4|0|5|
قمری سرخ‌شده در تابه|Turtle dove meat, pan-fried|202|29.9|0|9.2|
قمری خورشتی (پخته در خورش)|Turtle dove meat, stewed|151|27.5|0|4.6|
قمری تنوری|Turtle dove meat, oven-roasted|167|30.4|0|5|
ماکیان گینه (مرغ شاخدار) خام|Guinea fowl, raw|152|23.4|0|6.5|
ماکیان گینه (مرغ شاخدار) آب‌پز|Guinea fowl, boiled|189|31.6|0|7|
ماکیان گینه (مرغ شاخدار) کبابی|Guinea fowl, grilled|195|32.3|0|7.3|
ماکیان گینه (مرغ شاخدار) سرخ‌شده در تابه|Guinea fowl, pan-fried|231|31.8|0|11.5|
ماکیان گینه (مرغ شاخدار) خورشتی (پخته در خورش)|Guinea fowl, stewed|178|29.3|0|6.7|
ماکیان گینه (مرغ شاخدار) تنوری|Guinea fowl, oven-roasted|194|32.3|0|7.2|
جگر گاو خام|Beef liver, raw|130|20.4|3.9|3.6|جیگر گاو
جگر گاو آب‌پز|Beef liver, boiled|155|25.5|4.7|3.8|جیگر گاو
جگر گاو کبابی|Beef liver, grilled|161|26.5|4.7|4|جیگر گاو
جگر گاو سرخ‌شده در تابه|Beef liver, pan-fried|195|26.1|4.7|8|جیگر گاو
قلوه گاو خام|Beef kidney, raw|98|17.4|0|3.1|کلیه گاو
قلوه گاو آب‌پز|Beef kidney, boiled|117|21.8|0|3.3|کلیه گاو
قلوه گاو کبابی|Beef kidney, grilled|121|22.6|0|3.4|کلیه گاو
قلوه گاو سرخ‌شده در تابه|Beef kidney, pan-fried|157|22.3|0|7.5|کلیه گاو
دل گاو خام|Beef heart, raw|106|17.7|0.1|3.9|
دل گاو آب‌پز|Beef heart, boiled|126|22.1|0.1|4.1|
دل گاو کبابی|Beef heart, grilled|131|23|0.1|4.3|
دل گاو سرخ‌شده در تابه|Beef heart, pan-fried|167|22.7|0.1|8.4|
زبان گاو خام|Beef tongue, raw|219|14.9|3.7|16.1|
زبان گاو آب‌پز|Beef tongue, boiled|244|18.6|4.4|16.9|
زبان گاو کبابی|Beef tongue, grilled|254|19.4|4.4|17.7|
زبان گاو سرخ‌شده در تابه|Beef tongue, pan-fried|292|19.1|4.4|22|
مغز گاو خام|Beef brain, raw|134|10.4|0|10.3|
مغز گاو آب‌پز|Beef brain, boiled|149|13|0|10.8|
مغز گاو کبابی|Beef brain, grilled|156|13.5|0|11.3|
مغز گاو سرخ‌شده در تابه|Beef brain, pan-fried|193|13.3|0|15.5|
سیرابی گاو (شکمبه) خام|Beef tripe, raw|84|12|0|4|سیرابی
سیرابی گاو (شکمبه) آب‌پز|Beef tripe, boiled|98|15|0|4.2|سیرابی
سیرابی گاو (شکمبه) کبابی|Beef tripe, grilled|102|15.6|0|4.4|سیرابی
سیرابی گاو (شکمبه) سرخ‌شده در تابه|Beef tripe, pan-fried|138|15.4|0|8.5|سیرابی
شیردان گاو خام|Beef abomasum, raw|106|13|0|6|
شیردان گاو آب‌پز|Beef abomasum, boiled|122|16.3|0|6.3|
شیردان گاو کبابی|Beef abomasum, grilled|127|16.9|0|6.6|
شیردان گاو سرخ‌شده در تابه|Beef abomasum, pan-fried|163|16.6|0|10.7|
طحال گاو خام|Beef spleen, raw|100|18.3|0|3|
طحال گاو آب‌پز|Beef spleen, boiled|120|22.9|0|3.2|
طحال گاو کبابی|Beef spleen, grilled|125|23.8|0|3.3|
طحال گاو سرخ‌شده در تابه|Beef spleen, pan-fried|160|23.4|0|7.4|
ریه گاو خام|Beef lung, raw|87|16.2|0|2.5|
ریه گاو آب‌پز|Beef lung, boiled|105|20.3|0|2.6|
ریه گاو کبابی|Beef lung, grilled|110|21.1|0|2.8|
ریه گاو سرخ‌شده در تابه|Beef lung, pan-fried|144|20.7|0|6.8|
پاچه گاو خام|Beef trotters, raw|138|21|0|6|
پاچه گاو آب‌پز|Beef trotters, boiled|162|26.3|0|6.3|
پاچه گاو کبابی|Beef trotters, grilled|169|27.3|0|6.6|
پاچه گاو سرخ‌شده در تابه|Beef trotters, pan-fried|204|26.9|0|10.7|
کله گاو خام|Beef head meat, raw|180|18|0|12|
کله گاو آب‌پز|Beef head meat, boiled|203|22.5|0|12.6|
کله گاو کبابی|Beef head meat, grilled|212|23.4|0|13.2|
کله گاو سرخ‌شده در تابه|Beef head meat, pan-fried|249|23|0|17.4|
روده گاو خام|Beef intestine, raw|113|12.5|0|7|
روده گاو آب‌پز|Beef intestine, boiled|129|15.6|0|7.4|
روده گاو کبابی|Beef intestine, grilled|135|16.3|0|7.7|
روده گاو سرخ‌شده در تابه|Beef intestine, pan-fried|170|16|0|11.8|
جگر گوساله خام|Veal liver, raw|136|20.4|3.2|4.6|
جگر گوساله آب‌پز|Veal liver, boiled|160|25.5|3.8|4.8|
جگر گوساله کبابی|Veal liver, grilled|167|26.5|3.8|5.1|
جگر گوساله سرخ‌شده در تابه|Veal liver, pan-fried|202|26.1|3.8|9.2|
قلوه گوساله خام|Veal kidney, raw|100|15.8|0|4.1|
قلوه گوساله آب‌پز|Veal kidney, boiled|118|19.8|0|4.3|
قلوه گوساله کبابی|Veal kidney, grilled|123|20.5|0|4.5|
قلوه گوساله سرخ‌شده در تابه|Veal kidney, pan-fried|158|20.2|0|8.6|
دل گوساله خام|Veal heart, raw|102|17.5|0|3.5|
دل گوساله آب‌پز|Veal heart, boiled|121|21.9|0|3.7|
دل گوساله کبابی|Veal heart, grilled|126|22.8|0|3.9|
دل گوساله سرخ‌شده در تابه|Veal heart, pan-fried|161|22.4|0|7.9|
زبان گوساله خام|Veal tongue, raw|186|15|0|14|
زبان گوساله آب‌پز|Veal tongue, boiled|208|18.8|0|14.7|
زبان گوساله کبابی|Veal tongue, grilled|217|19.5|0|15.4|
زبان گوساله سرخ‌شده در تابه|Veal tongue, pan-fried|254|19.2|0|19.7|
مغز گوساله خام|Veal brain, raw|120|10.5|0|8.7|
مغز گوساله آب‌پز|Veal brain, boiled|134|13.1|0|9.1|
مغز گوساله کبابی|Veal brain, grilled|141|13.7|0|9.6|
مغز گوساله سرخ‌شده در تابه|Veal brain, pan-fried|177|13.4|0|13.7|
جگر گوسفند خام|Lamb liver, raw|134|20.4|1.8|5|جیگر گوسفند
جگر گوسفند آب‌پز|Lamb liver, boiled|159|25.5|2.2|5.3|جیگر گوسفند
جگر گوسفند کبابی|Lamb liver, grilled|164|26.5|2.2|5.5|جیگر گوسفند
جگر گوسفند سرخ‌شده در تابه|Lamb liver, pan-fried|200|26.1|2.2|9.6|جیگر گوسفند
قلوه گوسفند خام|Lamb kidney, raw|92|15.7|0.8|2.9|
قلوه گوسفند آب‌پز|Lamb kidney, boiled|109|19.6|1|3|
قلوه گوسفند کبابی|Lamb kidney, grilled|114|20.4|1|3.2|
قلوه گوسفند سرخ‌شده در تابه|Lamb kidney, pan-fried|149|20.1|1|7.2|
دل گوسفند خام|Lamb heart, raw|118|16.9|0.1|5.5|
دل گوسفند آب‌پز|Lamb heart, boiled|137|21.1|0.1|5.8|
دل گوسفند کبابی|Lamb heart, grilled|143|22|0.1|6.1|
دل گوسفند سرخ‌شده در تابه|Lamb heart, pan-fried|179|21.6|0.1|10.2|
زبان گوسفند خام|Lamb tongue, raw|216|13.4|0|18|
زبان گوسفند آب‌پز|Lamb tongue, boiled|237|16.8|0|18.9|
زبان گوسفند کبابی|Lamb tongue, grilled|248|17.4|0|19.8|
زبان گوسفند سرخ‌شده در تابه|Lamb tongue, pan-fried|287|17.2|0|24.2|
مغز گوسفند خام|Lamb brain, raw|117|10.4|0|8.4|
مغز گوسفند آب‌پز|Lamb brain, boiled|131|13|0|8.8|
مغز گوسفند کبابی|Lamb brain, grilled|137|13.5|0|9.2|
مغز گوسفند سرخ‌شده در تابه|Lamb brain, pan-fried|174|13.3|0|13.4|
شکمبه گوسفند خام|Lamb tripe, raw|93|12|0|5|
شکمبه گوسفند آب‌پز|Lamb tripe, boiled|108|15|0|5.3|
شکمبه گوسفند کبابی|Lamb tripe, grilled|112|15.6|0|5.5|
شکمبه گوسفند سرخ‌شده در تابه|Lamb tripe, pan-fried|148|15.4|0|9.6|
ریه گوسفند خام|Lamb lung, raw|91|16|0|3|
ریه گوسفند آب‌پز|Lamb lung, boiled|109|20|0|3.2|
ریه گوسفند کبابی|Lamb lung, grilled|113|20.8|0|3.3|
ریه گوسفند سرخ‌شده در تابه|Lamb lung, pan-fried|149|20.5|0|7.4|
کله‌پاچه گوسفند (گوشت) خام|Lamb head and trotters meat, raw|185|17|0|13|کله پاچه
کله‌پاچه گوسفند (گوشت) آب‌پز|Lamb head and trotters meat, boiled|209|21.3|0|13.7|کله پاچه
کله‌پاچه گوسفند (گوشت) کبابی|Lamb head and trotters meat, grilled|217|22.1|0|14.3|کله پاچه
کله‌پاچه گوسفند (گوشت) سرخ‌شده در تابه|Lamb head and trotters meat, pan-fried|255|21.8|0|18.6|کله پاچه
پاچه گوسفند خام|Lamb trotters, raw|143|20|0|7|
پاچه گوسفند آب‌پز|Lamb trotters, boiled|167|25|0|7.4|
پاچه گوسفند کبابی|Lamb trotters, grilled|173|26|0|7.7|
پاچه گوسفند سرخ‌شده در تابه|Lamb trotters, pan-fried|209|25.6|0|11.8|
بیضه گوسفند (قلوه‌سنگی) خام|Lamb testicle, raw|88|13|0|4|قلوه سنگی
بیضه گوسفند (قلوه‌سنگی) آب‌پز|Lamb testicle, boiled|103|16.3|0|4.2|قلوه سنگی
بیضه گوسفند (قلوه‌سنگی) کبابی|Lamb testicle, grilled|107|16.9|0|4.4|قلوه سنگی
بیضه گوسفند (قلوه‌سنگی) سرخ‌شده در تابه|Lamb testicle, pan-fried|143|16.6|0|8.5|قلوه سنگی
جگر بز خام|Goat liver, raw|129|20|2|4.5|
جگر بز آب‌پز|Goat liver, boiled|152|25|2.4|4.7|
جگر بز کبابی|Goat liver, grilled|159|26|2.4|5|
جگر بز سرخ‌شده در تابه|Goat liver, pan-fried|193|25.6|2.4|9|
دل بز خام|Goat heart, raw|109|17|0|4.5|
دل بز آب‌پز|Goat heart, boiled|128|21.3|0|4.7|
دل بز کبابی|Goat heart, grilled|133|22.1|0|5|
دل بز سرخ‌شده در تابه|Goat heart, pan-fried|168|21.8|0|9|
جگر مرغ خام|Chicken liver, raw|114|16.9|0.7|4.8|جیگر مرغ
جگر مرغ آب‌پز|Chicken liver, boiled|133|21.1|0.8|5|جیگر مرغ
جگر مرغ کبابی|Chicken liver, grilled|139|22|0.8|5.3|جیگر مرغ
جگر مرغ سرخ‌شده در تابه|Chicken liver, pan-fried|174|21.6|0.8|9.4|جیگر مرغ
قلب مرغ خام|Chicken heart, raw|147|15.6|0.1|9.3|دل مرغ
قلب مرغ آب‌پز|Chicken heart, boiled|167|19.5|0.1|9.8|دل مرغ
قلب مرغ کبابی|Chicken heart, grilled|173|20.3|0.1|10.2|دل مرغ
قلب مرغ سرخ‌شده در تابه|Chicken heart, pan-fried|210|20|0.1|14.4|دل مرغ
سنگدان مرغ خام|Chicken gizzard, raw|90|17.7|0|2.1|
سنگدان مرغ آب‌پز|Chicken gizzard, boiled|108|22.1|0|2.2|
سنگدان مرغ کبابی|Chicken gizzard, grilled|113|23|0|2.3|
سنگدان مرغ سرخ‌شده در تابه|Chicken gizzard, pan-fried|148|22.7|0|6.4|
جگر بوقلمون خام|Turkey liver, raw|131|21|0.5|5|
جگر بوقلمون آب‌پز|Turkey liver, boiled|155|26.3|0.6|5.3|
جگر بوقلمون کبابی|Turkey liver, grilled|161|27.3|0.6|5.5|
جگر بوقلمون سرخ‌شده در تابه|Turkey liver, pan-fried|196|26.9|0.6|9.6|
سنگدان بوقلمون خام|Turkey gizzard, raw|102|19|0|2.9|
سنگدان بوقلمون آب‌پز|Turkey gizzard, boiled|122|23.8|0|3|
سنگدان بوقلمون کبابی|Turkey gizzard, grilled|128|24.7|0|3.2|
سنگدان بوقلمون سرخ‌شده در تابه|Turkey gizzard, pan-fried|162|24.3|0|7.2|
جگر اردک (فواگرا) خام|Duck foie gras, raw|460|11.4|4.7|44|
جگر اردک (فواگرا) آب‌پز|Duck foie gras, boiled|495|14.3|5.6|46.2|
جگر اردک (فواگرا) کبابی|Duck foie gras, grilled|517|14.8|5.6|48.4|
جگر اردک (فواگرا) سرخ‌شده در تابه|Duck foie gras, pan-fried|561|14.6|5.6|53.3|
جگر غاز خام|Goose liver, raw|130|16.4|6.3|4.3|
جگر غاز آب‌پز|Goose liver, boiled|153|20.5|7.6|4.5|
جگر غاز کبابی|Goose liver, grilled|158|21.3|7.6|4.7|
جگر غاز سرخ‌شده در تابه|Goose liver, pan-fried|194|21|7.6|8.8|
جگر شتر خام|Camel liver, raw|128|20|3|4|
جگر شتر آب‌پز|Camel liver, boiled|152|25|3.6|4.2|
جگر شتر کبابی|Camel liver, grilled|158|26|3.6|4.4|
جگر شتر سرخ‌شده در تابه|Camel liver, pan-fried|193|25.6|3.6|8.5|
`;
const ING_FISH = `
ماهی هامور خام|Grouper, raw|87|19.4|0|1|هامور
ماهی هامور آب‌پز|Grouper, boiled|105|23.7|0|1.1|هامور
ماهی هامور بخارپز|Grouper, steamed|105|23.7|0|1.1|هامور
ماهی هامور کبابی (روی ذغال)|Grouper, grilled|115|24.8|0|1.7|هامور
ماهی هامور سرخ‌شده در تابه|Grouper, pan-fried|150|23.7|0|6.1|هامور
ماهی هامور سرخ‌شده با آرد|Grouper, floured and fried|180|21.7|5|8.1|هامور
ماهی هامور تنوری|Grouper, oven-baked|115|24.8|0|1.7|هامور
ماهی شیر خام|Kingfish (king mackerel), raw|97|20.5|0|1.7|شیر ماهی؛ماهی قباد
ماهی شیر آب‌پز|Kingfish (king mackerel), boiled|118|25|0|2|شیر ماهی؛ماهی قباد
ماهی شیر بخارپز|Kingfish (king mackerel), steamed|118|25|0|2|شیر ماهی؛ماهی قباد
ماهی شیر کبابی (روی ذغال)|Kingfish (king mackerel), grilled|127|26.2|0|2.5|شیر ماهی؛ماهی قباد
ماهی شیر سرخ‌شده در تابه|Kingfish (king mackerel), pan-fried|162|25|0|6.9|شیر ماهی؛ماهی قباد
ماهی شیر سرخ‌شده با آرد|Kingfish (king mackerel), floured and fried|192|23|5|8.9|شیر ماهی؛ماهی قباد
ماهی شیر تنوری|Kingfish (king mackerel), oven-baked|127|26.2|0|2.5|شیر ماهی؛ماهی قباد
ماهی حلوا سیاه خام|Black pomfret, raw|108|18|0|4|حلوا سیاه
ماهی حلوا سیاه آب‌پز|Black pomfret, boiled|129|22|0|4.6|حلوا سیاه
ماهی حلوا سیاه بخارپز|Black pomfret, steamed|129|22|0|4.6|حلوا سیاه
ماهی حلوا سیاه کبابی (روی ذغال)|Black pomfret, grilled|140|23|0|5.3|حلوا سیاه
ماهی حلوا سیاه سرخ‌شده در تابه|Black pomfret, pan-fried|173|22|0|9.4|حلوا سیاه
ماهی حلوا سیاه سرخ‌شده با آرد|Black pomfret, floured and fried|203|20.2|5|11.4|حلوا سیاه
ماهی حلوا سیاه تنوری|Black pomfret, oven-baked|139|23|0|5.2|حلوا سیاه
ماهی حلوا سفید خام|White pomfret, raw|104|18|0|3.5|حلوا سفید
ماهی حلوا سفید آب‌پز|White pomfret, boiled|124|22|0|4|حلوا سفید
ماهی حلوا سفید بخارپز|White pomfret, steamed|124|22|0|4|حلوا سفید
ماهی حلوا سفید کبابی (روی ذغال)|White pomfret, grilled|134|23|0|4.7|حلوا سفید
ماهی حلوا سفید سرخ‌شده در تابه|White pomfret, pan-fried|168|22|0|8.9|حلوا سفید
ماهی حلوا سفید سرخ‌شده با آرد|White pomfret, floured and fried|199|20.2|5|10.9|حلوا سفید
ماهی حلوا سفید تنوری|White pomfret, oven-baked|133|23|0|4.6|حلوا سفید
ماهی سنگسر خام|Sangsar fish (Persian Gulf), raw|94|19|0|2|سنگسر
ماهی سنگسر آب‌پز|Sangsar fish (Persian Gulf), boiled|114|23.2|0|2.3|سنگسر
ماهی سنگسر بخارپز|Sangsar fish (Persian Gulf), steamed|114|23.2|0|2.3|سنگسر
ماهی سنگسر کبابی (روی ذغال)|Sangsar fish (Persian Gulf), grilled|123|24.3|0|2.9|سنگسر
ماهی سنگسر سرخ‌شده در تابه|Sangsar fish (Persian Gulf), pan-fried|158|23.2|0|7.2|سنگسر
ماهی سنگسر سرخ‌شده با آرد|Sangsar fish (Persian Gulf), floured and fried|188|21.3|5|9.2|سنگسر
ماهی سنگسر تنوری|Sangsar fish (Persian Gulf), oven-baked|123|24.3|0|2.9|سنگسر
ماهی قزل‌آلا آب‌پز|Rainbow trout, boiled|136|25|0|4|قزل آلا
ماهی قزل‌آلا کبابی (روی ذغال)|Rainbow trout, grilled|147|26.2|0|4.7|قزل آلا
ماهی قزل‌آلا سرخ‌شده در تابه|Rainbow trout, pan-fried|180|25|0|8.9|قزل آلا
ماهی قزل‌آلا سرخ‌شده با آرد|Rainbow trout, floured and fried|210|23|5|10.9|قزل آلا
ماهی قزل‌آلا تنوری|Rainbow trout, oven-baked|146|26.2|0|4.6|قزل آلا
ماهی قزل‌آلای پرورشی خام|Farmed rainbow trout, raw|135|19.9|0|6.2|
ماهی قزل‌آلای پرورشی آب‌پز|Farmed rainbow trout, boiled|161|24.3|0|7.1|
ماهی قزل‌آلای پرورشی بخارپز|Farmed rainbow trout, steamed|161|24.3|0|7.1|
ماهی قزل‌آلای پرورشی کبابی (روی ذغال)|Farmed rainbow trout, grilled|173|25.5|0|7.9|
ماهی قزل‌آلای پرورشی سرخ‌شده در تابه|Farmed rainbow trout, pan-fried|203|24.3|0|11.8|
ماهی قزل‌آلای پرورشی سرخ‌شده با آرد|Farmed rainbow trout, floured and fried|233|22.3|5|13.8|
ماهی قزل‌آلای پرورشی تنوری|Farmed rainbow trout, oven-baked|172|25.5|0|7.8|
ماهی سفید دریای خزر خام|Caspian white fish (kutum), raw|101|18.5|0|3|ماهی سفید
ماهی سفید دریای خزر آب‌پز|Caspian white fish (kutum), boiled|121|22.6|0|3.4|ماهی سفید
ماهی سفید دریای خزر بخارپز|Caspian white fish (kutum), steamed|121|22.6|0|3.4|ماهی سفید
ماهی سفید دریای خزر کبابی (روی ذغال)|Caspian white fish (kutum), grilled|132|23.7|0|4.1|ماهی سفید
ماهی سفید دریای خزر سرخ‌شده در تابه|Caspian white fish (kutum), pan-fried|165|22.6|0|8.3|ماهی سفید
ماهی سفید دریای خزر سرخ‌شده با آرد|Caspian white fish (kutum), floured and fried|196|20.7|5|10.3|ماهی سفید
ماهی سفید دریای خزر تنوری|Caspian white fish (kutum), oven-baked|131|23.7|0|4|ماهی سفید
ماهی کپور خام|Common carp, raw|122|17.8|0|5.6|کپور
ماهی کپور آب‌پز|Common carp, boiled|144|21.7|0|6.4|کپور
ماهی کپور بخارپز|Common carp, steamed|144|21.7|0|6.4|کپور
ماهی کپور کبابی (روی ذغال)|Common carp, grilled|156|22.8|0|7.2|کپور
ماهی کپور سرخ‌شده در تابه|Common carp, pan-fried|188|21.7|0|11.2|کپور
ماهی کپور سرخ‌شده با آرد|Common carp, floured and fried|218|19.9|5|13.2|کپور
ماهی کپور تنوری|Common carp, oven-baked|155|22.8|0|7.1|کپور
ماهی کپور نقره‌ای خام|Silver carp, raw|113|17|0|5|
ماهی کپور نقره‌ای آب‌پز|Silver carp, boiled|135|20.7|0|5.8|
ماهی کپور نقره‌ای بخارپز|Silver carp, steamed|135|20.7|0|5.8|
ماهی کپور نقره‌ای کبابی (روی ذغال)|Silver carp, grilled|146|21.8|0|6.5|
ماهی کپور نقره‌ای سرخ‌شده در تابه|Silver carp, pan-fried|177|20.7|0|10.5|
ماهی کپور نقره‌ای سرخ‌شده با آرد|Silver carp, floured and fried|209|19|5|12.5|
ماهی کپور نقره‌ای تنوری|Silver carp, oven-baked|145|21.8|0|6.4|
ماهی کپور علف‌خوار خام|Grass carp, raw|122|18|0|5.6|آمور
ماهی کپور علف‌خوار آب‌پز|Grass carp, boiled|146|22|0|6.4|آمور
ماهی کپور علف‌خوار بخارپز|Grass carp, steamed|146|22|0|6.4|آمور
ماهی کپور علف‌خوار کبابی (روی ذغال)|Grass carp, grilled|157|23|0|7.2|آمور
ماهی کپور علف‌خوار سرخ‌شده در تابه|Grass carp, pan-fried|189|22|0|11.2|آمور
ماهی کپور علف‌خوار سرخ‌شده با آرد|Grass carp, floured and fried|220|20.2|5|13.2|آمور
ماهی کپور علف‌خوار تنوری|Grass carp, oven-baked|156|23|0|7.1|آمور
ماهی کپور سر گنده خام|Bighead carp, raw|107|16.5|0|4.5|
ماهی کپور سر گنده آب‌پز|Bighead carp, boiled|127|20.1|0|5.2|
ماهی کپور سر گنده بخارپز|Bighead carp, steamed|127|20.1|0|5.2|
ماهی کپور سر گنده کبابی (روی ذغال)|Bighead carp, grilled|138|21.1|0|5.9|
ماهی کپور سر گنده سرخ‌شده در تابه|Bighead carp, pan-fried|170|20.1|0|9.9|
ماهی کپور سر گنده سرخ‌شده با آرد|Bighead carp, floured and fried|201|18.5|5|11.9|
ماهی کپور سر گنده تنوری|Bighead carp, oven-baked|137|21.1|0|5.8|
ماهی تن زردبال خام|Yellowfin tuna, raw|102|24.4|0|0.5|تن ماهی
ماهی تن زردبال آب‌پز|Yellowfin tuna, boiled|125|29.8|0|0.6|تن ماهی
ماهی تن زردبال بخارپز|Yellowfin tuna, steamed|125|29.8|0|0.6|تن ماهی
ماهی تن زردبال کبابی (روی ذغال)|Yellowfin tuna, grilled|135|31.2|0|1.1|تن ماهی
ماهی تن زردبال سرخ‌شده در تابه|Yellowfin tuna, pan-fried|169|29.8|0|5.5|تن ماهی
ماهی تن زردبال سرخ‌شده با آرد|Yellowfin tuna, floured and fried|197|27.3|5|7.5|تن ماهی
ماهی تن زردبال تنوری|Yellowfin tuna, oven-baked|135|31.2|0|1.1|تن ماهی
ماهی تن آبی (بلوفین) خام|Bluefin tuna, raw|137|23.3|0|4.9|
ماهی تن آبی (بلوفین) آب‌پز|Bluefin tuna, boiled|164|28.4|0|5.6|
ماهی تن آبی (بلوفین) بخارپز|Bluefin tuna, steamed|164|28.4|0|5.6|
ماهی تن آبی (بلوفین) کبابی (روی ذغال)|Bluefin tuna, grilled|177|29.8|0|6.4|
ماهی تن آبی (بلوفین) سرخ‌شده در تابه|Bluefin tuna, pan-fried|207|28.4|0|10.4|
ماهی تن آبی (بلوفین) سرخ‌شده با آرد|Bluefin tuna, floured and fried|236|26.1|5|12.4|
ماهی تن آبی (بلوفین) تنوری|Bluefin tuna, oven-baked|176|29.8|0|6.3|
ماهی تن نواری (اسکیپ جک) خام|Skipjack tuna, raw|97|22|0|1|
ماهی تن نواری (اسکیپ جک) آب‌پز|Skipjack tuna, boiled|117|26.8|0|1.1|
ماهی تن نواری (اسکیپ جک) بخارپز|Skipjack tuna, steamed|117|26.8|0|1.1|
ماهی تن نواری (اسکیپ جک) کبابی (روی ذغال)|Skipjack tuna, grilled|128|28.2|0|1.7|
ماهی تن نواری (اسکیپ جک) سرخ‌شده در تابه|Skipjack tuna, pan-fried|162|26.8|0|6.1|
ماهی تن نواری (اسکیپ جک) سرخ‌شده با آرد|Skipjack tuna, floured and fried|191|24.6|5|8.1|
ماهی تن نواری (اسکیپ جک) تنوری|Skipjack tuna, oven-baked|128|28.2|0|1.7|
ماهی تن لانگ‌تیل خام|Longtail tuna, raw|103|23|0|1.2|
ماهی تن لانگ‌تیل آب‌پز|Longtail tuna, boiled|125|28.1|0|1.4|
ماهی تن لانگ‌تیل بخارپز|Longtail tuna, steamed|125|28.1|0|1.4|
ماهی تن لانگ‌تیل کبابی (روی ذغال)|Longtail tuna, grilled|135|29.4|0|1.9|
ماهی تن لانگ‌تیل سرخ‌شده در تابه|Longtail tuna, pan-fried|169|28.1|0|6.3|
ماهی تن لانگ‌تیل سرخ‌شده با آرد|Longtail tuna, floured and fried|198|25.8|5|8.3|
ماهی تن لانگ‌تیل تنوری|Longtail tuna, oven-baked|135|29.4|0|1.9|
ماهی شوریده خام|Croaker (shuri), raw|90|18.5|0|1.8|شوریده
ماهی شوریده آب‌پز|Croaker (shuri), boiled|109|22.6|0|2.1|شوریده
ماهی شوریده بخارپز|Croaker (shuri), steamed|109|22.6|0|2.1|شوریده
ماهی شوریده کبابی (روی ذغال)|Croaker (shuri), grilled|119|23.7|0|2.7|شوریده
ماهی شوریده سرخ‌شده در تابه|Croaker (shuri), pan-fried|153|22.6|0|7|شوریده
ماهی شوریده سرخ‌شده با آرد|Croaker (shuri), floured and fried|184|20.7|5|9|شوریده
ماهی شوریده تنوری|Croaker (shuri), oven-baked|118|23.7|0|2.6|شوریده
ماهی زمین‌کن خام|Rabbitfish, raw|99|19|0|2.5|زمین کن
ماهی زمین‌کن آب‌پز|Rabbitfish, boiled|119|23.2|0|2.9|زمین کن
ماهی زمین‌کن بخارپز|Rabbitfish, steamed|119|23.2|0|2.9|زمین کن
ماهی زمین‌کن کبابی (روی ذغال)|Rabbitfish, grilled|129|24.3|0|3.5|زمین کن
ماهی زمین‌کن سرخ‌شده در تابه|Rabbitfish, pan-fried|163|23.2|0|7.8|زمین کن
ماهی زمین‌کن سرخ‌شده با آرد|Rabbitfish, floured and fried|193|21.3|5|9.8|زمین کن
ماهی زمین‌کن تنوری|Rabbitfish, oven-baked|128|24.3|0|3.4|زمین کن
ماهی صبور خام|Hilsa shad (sobour), raw|191|18.5|0|13|صبور
ماهی صبور آب‌پز|Hilsa shad (sobour), boiled|225|22.6|0|14.9|صبور
ماهی صبور بخارپز|Hilsa shad (sobour), steamed|225|22.6|0|14.9|صبور
ماهی صبور کبابی (روی ذغال)|Hilsa shad (sobour), grilled|240|23.7|0|16.1|صبور
ماهی صبور سرخ‌شده در تابه|Hilsa shad (sobour), pan-fried|264|22.6|0|19.3|صبور
ماهی صبور سرخ‌شده با آرد|Hilsa shad (sobour), floured and fried|295|20.7|5|21.3|صبور
ماهی صبور تنوری|Hilsa shad (sobour), oven-baked|237|23.7|0|15.8|صبور
ماهی شانک خام|Gilthead seabream, raw|106|20|0|2.9|شانک
ماهی شانک آب‌پز|Gilthead seabream, boiled|127|24.4|0|3.3|شانک
ماهی شانک بخارپز|Gilthead seabream, steamed|127|24.4|0|3.3|شانک
ماهی شانک کبابی (روی ذغال)|Gilthead seabream, grilled|138|25.6|0|4|شانک
ماهی شانک سرخ‌شده در تابه|Gilthead seabream, pan-fried|171|24.4|0|8.2|شانک
ماهی شانک سرخ‌شده با آرد|Gilthead seabream, floured and fried|201|22.4|5|10.2|شانک
ماهی شانک تنوری|Gilthead seabream, oven-baked|138|25.6|0|3.9|شانک
ماهی شانک زردباله خام|Yellowfin seabream, raw|101|19.5|0|2.5|
ماهی شانک زردباله آب‌پز|Yellowfin seabream, boiled|121|23.8|0|2.9|
ماهی شانک زردباله بخارپز|Yellowfin seabream, steamed|121|23.8|0|2.9|
ماهی شانک زردباله کبابی (روی ذغال)|Yellowfin seabream, grilled|132|25|0|3.5|
ماهی شانک زردباله سرخ‌شده در تابه|Yellowfin seabream, pan-fried|165|23.8|0|7.8|
ماهی شانک زردباله سرخ‌شده با آرد|Yellowfin seabream, floured and fried|195|21.8|5|9.8|
ماهی شانک زردباله تنوری|Yellowfin seabream, oven-baked|131|25|0|3.4|
ماهی بیاح خام|Mullet (biyah), raw|109|19|0|3.7|بیاح
ماهی بیاح آب‌پز|Mullet (biyah), boiled|132|23.2|0|4.3|بیاح
ماهی بیاح بخارپز|Mullet (biyah), steamed|132|23.2|0|4.3|بیاح
ماهی بیاح کبابی (روی ذغال)|Mullet (biyah), grilled|141|24.3|0|4.9|بیاح
ماهی بیاح سرخ‌شده در تابه|Mullet (biyah), pan-fried|175|23.2|0|9.1|بیاح
ماهی بیاح سرخ‌شده با آرد|Mullet (biyah), floured and fried|205|21.3|5|11.1|بیاح
ماهی بیاح تنوری|Mullet (biyah), oven-baked|141|24.3|0|4.9|بیاح
ماهی کفال خاکستری خام|Grey mullet, raw|112|19.4|0|3.8|کفال
ماهی کفال خاکستری آب‌پز|Grey mullet, boiled|134|23.7|0|4.4|کفال
ماهی کفال خاکستری بخارپز|Grey mullet, steamed|134|23.7|0|4.4|کفال
ماهی کفال خاکستری کبابی (روی ذغال)|Grey mullet, grilled|145|24.8|0|5.1|کفال
ماهی کفال خاکستری سرخ‌شده در تابه|Grey mullet, pan-fried|178|23.7|0|9.2|کفال
ماهی کفال خاکستری سرخ‌شده با آرد|Grey mullet, floured and fried|208|21.7|5|11.2|کفال
ماهی کفال خاکستری تنوری|Grey mullet, oven-baked|144|24.8|0|5|کفال
ماهی سوف خام|Pike-perch (zander), raw|84|19|0|0.9|سوف
ماهی سوف آب‌پز|Pike-perch (zander), boiled|102|23.2|0|1|سوف
ماهی سوف بخارپز|Pike-perch (zander), steamed|102|23.2|0|1|سوف
ماهی سوف کبابی (روی ذغال)|Pike-perch (zander), grilled|112|24.3|0|1.6|سوف
ماهی سوف سرخ‌شده در تابه|Pike-perch (zander), pan-fried|147|23.2|0|6|سوف
ماهی سوف سرخ‌شده با آرد|Pike-perch (zander), floured and fried|177|21.3|5|8|سوف
ماهی سوف تنوری|Pike-perch (zander), oven-baked|112|24.3|0|1.6|سوف
ماهی آزاد اقیانوس اطلس پرورشی خام|Atlantic salmon, farmed, raw|202|20.4|0|13.4|سالمون؛ماهی آزاد
ماهی آزاد اقیانوس اطلس پرورشی آب‌پز|Atlantic salmon, farmed, boiled|238|24.9|0|15.4|سالمون؛ماهی آزاد
ماهی آزاد اقیانوس اطلس پرورشی بخارپز|Atlantic salmon, farmed, steamed|238|24.9|0|15.4|سالمون؛ماهی آزاد
ماهی آزاد اقیانوس اطلس پرورشی کبابی (روی ذغال)|Atlantic salmon, farmed, grilled|254|26.1|0|16.6|سالمون؛ماهی آزاد
ماهی آزاد اقیانوس اطلس پرورشی سرخ‌شده در تابه|Atlantic salmon, farmed, pan-fried|277|24.9|0|19.7|سالمون؛ماهی آزاد
ماهی آزاد اقیانوس اطلس پرورشی سرخ‌شده با آرد|Atlantic salmon, farmed, floured and fried|307|22.8|5|21.7|سالمون؛ماهی آزاد
ماهی آزاد اقیانوس اطلس پرورشی تنوری|Atlantic salmon, farmed, oven-baked|251|26.1|0|16.3|سالمون؛ماهی آزاد
ماهی آزاد وحشی خام|Wild salmon, raw|136|19.8|0|6.3|سالمون وحشی
ماهی آزاد وحشی آب‌پز|Wild salmon, boiled|162|24.2|0|7.2|سالمون وحشی
ماهی آزاد وحشی بخارپز|Wild salmon, steamed|162|24.2|0|7.2|سالمون وحشی
ماهی آزاد وحشی کبابی (روی ذغال)|Wild salmon, grilled|174|25.3|0|8.1|سالمون وحشی
ماهی آزاد وحشی سرخ‌شده در تابه|Wild salmon, pan-fried|204|24.2|0|11.9|سالمون وحشی
ماهی آزاد وحشی سرخ‌شده با آرد|Wild salmon, floured and fried|234|22.2|5|13.9|سالمون وحشی
ماهی آزاد وحشی تنوری|Wild salmon, oven-baked|172|25.3|0|7.9|سالمون وحشی
ماهی آزاد صورتی خام|Pink salmon, raw|119|19.9|0|4.4|
ماهی آزاد صورتی آب‌پز|Pink salmon, boiled|143|24.3|0|5.1|
ماهی آزاد صورتی بخارپز|Pink salmon, steamed|143|24.3|0|5.1|
ماهی آزاد صورتی کبابی (روی ذغال)|Pink salmon, grilled|154|25.5|0|5.8|
ماهی آزاد صورتی سرخ‌شده در تابه|Pink salmon, pan-fried|185|24.3|0|9.8|
ماهی آزاد صورتی سرخ‌شده با آرد|Pink salmon, floured and fried|215|22.3|5|11.8|
ماهی آزاد صورتی تنوری|Pink salmon, oven-baked|153|25.5|0|5.7|
ماهی آزاد قرمز (ساکی) خام|Sockeye salmon, raw|151|21.3|0|7.3|
ماهی آزاد قرمز (ساکی) آب‌پز|Sockeye salmon, boiled|180|26|0|8.4|
ماهی آزاد قرمز (ساکی) بخارپز|Sockeye salmon, steamed|180|26|0|8.4|
ماهی آزاد قرمز (ساکی) کبابی (روی ذغال)|Sockeye salmon, grilled|193|27.3|0|9.3|
ماهی آزاد قرمز (ساکی) سرخ‌شده در تابه|Sockeye salmon, pan-fried|221|26|0|13|
ماهی آزاد قرمز (ساکی) سرخ‌شده با آرد|Sockeye salmon, floured and fried|251|23.9|5|15|
ماهی آزاد قرمز (ساکی) تنوری|Sockeye salmon, oven-baked|191|27.3|0|9.1|
ماهی آزاد کوهو خام|Coho salmon, raw|140|21.6|0|6|
ماهی آزاد کوهو آب‌پز|Coho salmon, boiled|168|26.4|0|6.9|
ماهی آزاد کوهو بخارپز|Coho salmon, steamed|168|26.4|0|6.9|
ماهی آزاد کوهو کبابی (روی ذغال)|Coho salmon, grilled|180|27.6|0|7.7|
ماهی آزاد کوهو سرخ‌شده در تابه|Coho salmon, pan-fried|210|26.4|0|11.6|
ماهی آزاد کوهو سرخ‌شده با آرد|Coho salmon, floured and fried|239|24.2|5|13.6|
ماهی آزاد کوهو تنوری|Coho salmon, oven-baked|179|27.6|0|7.6|
ماهی خاویاری (فیل‌ماهی) خام|Beluga sturgeon, raw|99|16.1|0|3.8|فیل ماهی
ماهی خاویاری (فیل‌ماهی) آب‌پز|Beluga sturgeon, boiled|118|19.6|0|4.4|فیل ماهی
ماهی خاویاری (فیل‌ماهی) بخارپز|Beluga sturgeon, steamed|118|19.6|0|4.4|فیل ماهی
ماهی خاویاری (فیل‌ماهی) کبابی (روی ذغال)|Beluga sturgeon, grilled|128|20.6|0|5.1|فیل ماهی
ماهی خاویاری (فیل‌ماهی) سرخ‌شده در تابه|Beluga sturgeon, pan-fried|161|19.6|0|9.2|فیل ماهی
ماهی خاویاری (فیل‌ماهی) سرخ‌شده با آرد|Beluga sturgeon, floured and fried|193|18|5|11.2|فیل ماهی
ماهی خاویاری (فیل‌ماهی) تنوری|Beluga sturgeon, oven-baked|127|20.6|0|5|فیل ماهی
ماهی ازون‌برون خام|Persian sturgeon (osetra), raw|104|16.5|0|4.2|ازون برون
ماهی ازون‌برون آب‌پز|Persian sturgeon (osetra), boiled|124|20.1|0|4.8|ازون برون
ماهی ازون‌برون بخارپز|Persian sturgeon (osetra), steamed|124|20.1|0|4.8|ازون برون
ماهی ازون‌برون کبابی (روی ذغال)|Persian sturgeon (osetra), grilled|134|21.1|0|5.5|ازون برون
ماهی ازون‌برون سرخ‌شده در تابه|Persian sturgeon (osetra), pan-fried|167|20.1|0|9.6|ازون برون
ماهی ازون‌برون سرخ‌شده با آرد|Persian sturgeon (osetra), floured and fried|198|18.5|5|11.6|ازون برون
ماهی ازون‌برون تنوری|Persian sturgeon (osetra), oven-baked|134|21.1|0|5.5|ازون برون
ماهی چالباش خام|Ship sturgeon, raw|102|16.5|0|4|
ماهی چالباش آب‌پز|Ship sturgeon, boiled|122|20.1|0|4.6|
ماهی چالباش بخارپز|Ship sturgeon, steamed|122|20.1|0|4.6|
ماهی چالباش کبابی (روی ذغال)|Ship sturgeon, grilled|132|21.1|0|5.3|
ماهی چالباش سرخ‌شده در تابه|Ship sturgeon, pan-fried|165|20.1|0|9.4|
ماهی چالباش سرخ‌شده با آرد|Ship sturgeon, floured and fried|197|18.5|5|11.4|
ماهی چالباش تنوری|Ship sturgeon, oven-baked|131|21.1|0|5.2|
ماهی شیپ خام|Starry sturgeon, raw|102|17|0|3.8|
ماهی شیپ آب‌پز|Starry sturgeon, boiled|122|20.7|0|4.4|
ماهی شیپ بخارپز|Starry sturgeon, steamed|122|20.7|0|4.4|
ماهی شیپ کبابی (روی ذغال)|Starry sturgeon, grilled|133|21.8|0|5.1|
ماهی شیپ سرخ‌شده در تابه|Starry sturgeon, pan-fried|166|20.7|0|9.2|
ماهی شیپ سرخ‌شده با آرد|Starry sturgeon, floured and fried|197|19|5|11.2|
ماهی شیپ تنوری|Starry sturgeon, oven-baked|132|21.8|0|5|
ماهی اوزون برون خزر خام|Caspian sturgeon, raw|105|16.5|0|4.3|
ماهی اوزون برون خزر آب‌پز|Caspian sturgeon, boiled|125|20.1|0|4.9|
ماهی اوزون برون خزر بخارپز|Caspian sturgeon, steamed|125|20.1|0|4.9|
ماهی اوزون برون خزر کبابی (روی ذغال)|Caspian sturgeon, grilled|136|21.1|0|5.7|
ماهی اوزون برون خزر سرخ‌شده در تابه|Caspian sturgeon, pan-fried|168|20.1|0|9.7|
ماهی اوزون برون خزر سرخ‌شده با آرد|Caspian sturgeon, floured and fried|199|18.5|5|11.7|
ماهی اوزون برون خزر تنوری|Caspian sturgeon, oven-baked|135|21.1|0|5.6|
ماهی کیلکا خام|Kilka (Caspian sprat), raw|115|17.5|0|5|کیلکا
ماهی کیلکا آب‌پز|Kilka (Caspian sprat), boiled|137|21.3|0|5.8|کیلکا
ماهی کیلکا بخارپز|Kilka (Caspian sprat), steamed|137|21.3|0|5.8|کیلکا
ماهی کیلکا کبابی (روی ذغال)|Kilka (Caspian sprat), grilled|148|22.4|0|6.5|کیلکا
ماهی کیلکا سرخ‌شده در تابه|Kilka (Caspian sprat), pan-fried|180|21.3|0|10.5|کیلکا
ماهی کیلکا سرخ‌شده با آرد|Kilka (Caspian sprat), floured and fried|211|19.6|5|12.5|کیلکا
ماهی کیلکا تنوری|Kilka (Caspian sprat), oven-baked|147|22.4|0|6.4|کیلکا
ماهی ساردین خام|Sardine, raw|173|20.8|0|10|ساردین
ماهی ساردین آب‌پز|Sardine, boiled|205|25.4|0|11.5|ساردین
ماهی ساردین بخارپز|Sardine, steamed|205|25.4|0|11.5|ساردین
ماهی ساردین کبابی (روی ذغال)|Sardine, grilled|219|26.6|0|12.5|ساردین
ماهی ساردین سرخ‌شده در تابه|Sardine, pan-fried|246|25.4|0|16|ساردین
ماهی ساردین سرخ‌شده با آرد|Sardine, floured and fried|275|23.3|5|18|ساردین
ماهی ساردین تنوری|Sardine, oven-baked|217|26.6|0|12.3|ساردین
ماهی ساردین اقیانوس اطلس خام|Atlantic sardine, raw|170|20.5|0|9.8|
ماهی ساردین اقیانوس اطلس آب‌پز|Atlantic sardine, boiled|202|25|0|11.3|
ماهی ساردین اقیانوس اطلس بخارپز|Atlantic sardine, steamed|202|25|0|11.3|
ماهی ساردین اقیانوس اطلس کبابی (روی ذغال)|Atlantic sardine, grilled|216|26.2|0|12.3|
ماهی ساردین اقیانوس اطلس سرخ‌شده در تابه|Atlantic sardine, pan-fried|242|25|0|15.8|
ماهی ساردین اقیانوس اطلس سرخ‌شده با آرد|Atlantic sardine, floured and fried|272|23|5|17.8|
ماهی ساردین اقیانوس اطلس تنوری|Atlantic sardine, oven-baked|214|26.2|0|12.1|
ماهی ساردین هندی خام|Indian oil sardine, raw|141|19.5|0|7|
ماهی ساردین هندی آب‌پز|Indian oil sardine, boiled|167|23.8|0|8|
ماهی ساردین هندی بخارپز|Indian oil sardine, steamed|167|23.8|0|8|
ماهی ساردین هندی کبابی (روی ذغال)|Indian oil sardine, grilled|180|25|0|8.9|
ماهی ساردین هندی سرخ‌شده در تابه|Indian oil sardine, pan-fried|210|23.8|0|12.7|
ماهی ساردین هندی سرخ‌شده با آرد|Indian oil sardine, floured and fried|240|21.8|5|14.7|
ماهی ساردین هندی تنوری|Indian oil sardine, oven-baked|179|25|0|8.8|
ماهی اسکومبری خام|Atlantic mackerel, raw|200|18.6|0|13.9|ماهی خال‌خالی
ماهی اسکومبری آب‌پز|Atlantic mackerel, boiled|235|22.7|0|16|ماهی خال‌خالی
ماهی اسکومبری بخارپز|Atlantic mackerel, steamed|235|22.7|0|16|ماهی خال‌خالی
ماهی اسکومبری کبابی (روی ذغال)|Atlantic mackerel, grilled|250|23.8|0|17.2|ماهی خال‌خالی
ماهی اسکومبری سرخ‌شده در تابه|Atlantic mackerel, pan-fried|274|22.7|0|20.3|ماهی خال‌خالی
ماهی اسکومبری سرخ‌شده با آرد|Atlantic mackerel, floured and fried|304|20.8|5|22.3|ماهی خال‌خالی
ماهی اسکومبری تنوری|Atlantic mackerel, oven-baked|247|23.8|0|16.9|ماهی خال‌خالی
ماهی خال‌مخالی خام|Spanish mackerel, raw|134|19.3|0|6.3|
ماهی خال‌مخالی آب‌پز|Spanish mackerel, boiled|159|23.5|0|7.2|
ماهی خال‌مخالی بخارپز|Spanish mackerel, steamed|159|23.5|0|7.2|
ماهی خال‌مخالی کبابی (روی ذغال)|Spanish mackerel, grilled|172|24.7|0|8.1|
ماهی خال‌مخالی سرخ‌شده در تابه|Spanish mackerel, pan-fried|201|23.5|0|11.9|
ماهی خال‌مخالی سرخ‌شده با آرد|Spanish mackerel, floured and fried|232|21.6|5|13.9|
ماهی خال‌مخالی تنوری|Spanish mackerel, oven-baked|170|24.7|0|7.9|
ماهی خال‌مخالی نواری خام|Narrow-barred Spanish mackerel, raw|116|20|0|4|
ماهی خال‌مخالی نواری آب‌پز|Narrow-barred Spanish mackerel, boiled|139|24.4|0|4.6|
ماهی خال‌مخالی نواری بخارپز|Narrow-barred Spanish mackerel, steamed|139|24.4|0|4.6|
ماهی خال‌مخالی نواری کبابی (روی ذغال)|Narrow-barred Spanish mackerel, grilled|150|25.6|0|5.3|
ماهی خال‌مخالی نواری سرخ‌شده در تابه|Narrow-barred Spanish mackerel, pan-fried|182|24.4|0|9.4|
ماهی خال‌مخالی نواری سرخ‌شده با آرد|Narrow-barred Spanish mackerel, floured and fried|212|22.4|5|11.4|
ماهی خال‌مخالی نواری تنوری|Narrow-barred Spanish mackerel, oven-baked|149|25.6|0|5.2|
ماهی کوتر خام|Cutlassfish (kuter), raw|104|18|0|3.5|کوتر
ماهی کوتر آب‌پز|Cutlassfish (kuter), boiled|124|22|0|4|کوتر
ماهی کوتر بخارپز|Cutlassfish (kuter), steamed|124|22|0|4|کوتر
ماهی کوتر کبابی (روی ذغال)|Cutlassfish (kuter), grilled|134|23|0|4.7|کوتر
ماهی کوتر سرخ‌شده در تابه|Cutlassfish (kuter), pan-fried|168|22|0|8.9|کوتر
ماهی کوتر سرخ‌شده با آرد|Cutlassfish (kuter), floured and fried|199|20.2|5|10.9|کوتر
ماهی کوتر تنوری|Cutlassfish (kuter), oven-baked|133|23|0|4.6|کوتر
ماهی سرخو خام|Red snapper, raw|94|20.5|0|1.3|سرخو
ماهی سرخو آب‌پز|Red snapper, boiled|114|25|0|1.5|سرخو
ماهی سرخو بخارپز|Red snapper, steamed|114|25|0|1.5|سرخو
ماهی سرخو کبابی (روی ذغال)|Red snapper, grilled|124|26.2|0|2.1|سرخو
ماهی سرخو سرخ‌شده در تابه|Red snapper, pan-fried|158|25|0|6.4|سرخو
ماهی سرخو سرخ‌شده با آرد|Red snapper, floured and fried|188|23|5|8.4|سرخو
ماهی سرخو تنوری|Red snapper, oven-baked|123|26.2|0|2|سرخو
ماهی سرخو معمولی خام|Common snapper, raw|94|20|0|1.5|
ماهی سرخو معمولی آب‌پز|Common snapper, boiled|113|24.4|0|1.7|
ماهی سرخو معمولی بخارپز|Common snapper, steamed|113|24.4|0|1.7|
ماهی سرخو معمولی کبابی (روی ذغال)|Common snapper, grilled|123|25.6|0|2.3|
ماهی سرخو معمولی سرخ‌شده در تابه|Common snapper, pan-fried|158|24.4|0|6.7|
ماهی سرخو معمولی سرخ‌شده با آرد|Common snapper, floured and fried|188|22.4|5|8.7|
ماهی سرخو معمولی تنوری|Common snapper, oven-baked|123|25.6|0|2.3|
ماهی تیلاپیا خام|Tilapia, raw|96|20.1|0|1.7|تیلاپیا
ماهی تیلاپیا آب‌پز|Tilapia, boiled|116|24.5|0|2|تیلاپیا
ماهی تیلاپیا بخارپز|Tilapia, steamed|116|24.5|0|2|تیلاپیا
ماهی تیلاپیا کبابی (روی ذغال)|Tilapia, grilled|125|25.7|0|2.5|تیلاپیا
ماهی تیلاپیا سرخ‌شده در تابه|Tilapia, pan-fried|160|24.5|0|6.9|تیلاپیا
ماهی تیلاپیا سرخ‌شده با آرد|Tilapia, floured and fried|190|22.5|5|8.9|تیلاپیا
ماهی تیلاپیا تنوری|Tilapia, oven-baked|125|25.7|0|2.5|تیلاپیا
ماهی کفشک خام|Flounder, raw|86|18.8|0|1.2|کفشک
ماهی کفشک آب‌پز|Flounder, boiled|104|22.9|0|1.4|کفشک
ماهی کفشک بخارپز|Flounder, steamed|104|22.9|0|1.4|کفشک
ماهی کفشک کبابی (روی ذغال)|Flounder, grilled|114|24.1|0|1.9|کفشک
ماهی کفشک سرخ‌شده در تابه|Flounder, pan-fried|148|22.9|0|6.3|کفشک
ماهی کفشک سرخ‌شده با آرد|Flounder, floured and fried|179|21.1|5|8.3|کفشک
ماهی کفشک تنوری|Flounder, oven-baked|114|24.1|0|1.9|کفشک
ماهی کفشک دریایی (سول) خام|Sole, raw|84|17.5|0|1.5|
ماهی کفشک دریایی (سول) آب‌پز|Sole, boiled|101|21.3|0|1.7|
ماهی کفشک دریایی (سول) بخارپز|Sole, steamed|101|21.3|0|1.7|
ماهی کفشک دریایی (سول) کبابی (روی ذغال)|Sole, grilled|110|22.4|0|2.3|
ماهی کفشک دریایی (سول) سرخ‌شده در تابه|Sole, pan-fried|146|21.3|0|6.7|
ماهی کفشک دریایی (سول) سرخ‌شده با آرد|Sole, floured and fried|177|19.6|5|8.7|
ماهی کفشک دریایی (سول) تنوری|Sole, oven-baked|110|22.4|0|2.3|
ماهی گربه (گربه ماهی) خام|Catfish, raw|91|16.4|0|2.8|
ماهی گربه (گربه ماهی) آب‌پز|Catfish, boiled|109|20|0|3.2|
ماهی گربه (گربه ماهی) بخارپز|Catfish, steamed|109|20|0|3.2|
ماهی گربه (گربه ماهی) کبابی (روی ذغال)|Catfish, grilled|119|21|0|3.9|
ماهی گربه (گربه ماهی) سرخ‌شده در تابه|Catfish, pan-fried|153|20|0|8.1|
ماهی گربه (گربه ماهی) سرخ‌شده با آرد|Catfish, floured and fried|185|18.4|5|10.1|
ماهی گربه (گربه ماهی) تنوری|Catfish, oven-baked|118|21|0|3.8|
ماهی کاد خام|Atlantic cod, raw|78|17.8|0|0.7|ماهی ماسه‌ای؛کاد
ماهی کاد آب‌پز|Atlantic cod, boiled|94|21.7|0|0.8|ماهی ماسه‌ای؛کاد
ماهی کاد بخارپز|Atlantic cod, steamed|94|21.7|0|0.8|ماهی ماسه‌ای؛کاد
ماهی کاد کبابی (روی ذغال)|Atlantic cod, grilled|103|22.8|0|1.3|ماهی ماسه‌ای؛کاد
ماهی کاد سرخ‌شده در تابه|Atlantic cod, pan-fried|139|21.7|0|5.8|ماهی ماسه‌ای؛کاد
ماهی کاد سرخ‌شده با آرد|Atlantic cod, floured and fried|170|19.9|5|7.8|ماهی ماسه‌ای؛کاد
ماهی کاد تنوری|Atlantic cod, oven-baked|103|22.8|0|1.3|ماهی ماسه‌ای؛کاد
ماهی هیک خام|Hake, raw|80|17|0|1.3|
ماهی هیک آب‌پز|Hake, boiled|96|20.7|0|1.5|
ماهی هیک بخارپز|Hake, steamed|96|20.7|0|1.5|
ماهی هیک کبابی (روی ذغال)|Hake, grilled|106|21.8|0|2.1|
ماهی هیک سرخ‌شده در تابه|Hake, pan-fried|140|20.7|0|6.4|
ماهی هیک سرخ‌شده با آرد|Hake, floured and fried|172|19|5|8.4|
ماهی هیک تنوری|Hake, oven-baked|105|21.8|0|2|
ماهی پولاک خام|Pollock, raw|85|19|0|1|
ماهی پولاک آب‌پز|Pollock, boiled|103|23.2|0|1.1|
ماهی پولاک بخارپز|Pollock, steamed|103|23.2|0|1.1|
ماهی پولاک کبابی (روی ذغال)|Pollock, grilled|113|24.3|0|1.7|
ماهی پولاک سرخ‌شده در تابه|Pollock, pan-fried|148|23.2|0|6.1|
ماهی پولاک سرخ‌شده با آرد|Pollock, floured and fried|178|21.3|5|8.1|
ماهی پولاک تنوری|Pollock, oven-baked|113|24.3|0|1.7|
ماهی هادوک خام|Haddock, raw|82|18.9|0|0.7|
ماهی هادوک آب‌پز|Haddock, boiled|100|23.1|0|0.8|
ماهی هادوک بخارپز|Haddock, steamed|100|23.1|0|0.8|
ماهی هادوک کبابی (روی ذغال)|Haddock, grilled|109|24.2|0|1.3|
ماهی هادوک سرخ‌شده در تابه|Haddock, pan-fried|145|23.1|0|5.8|
ماهی هادوک سرخ‌شده با آرد|Haddock, floured and fried|175|21.2|5|7.8|
ماهی هادوک تنوری|Haddock, oven-baked|109|24.2|0|1.3|
ماهی هالیبوت خام|Halibut, raw|104|20.8|0|2.3|
ماهی هالیبوت آب‌پز|Halibut, boiled|125|25.4|0|2.6|
ماهی هالیبوت بخارپز|Halibut, steamed|125|25.4|0|2.6|
ماهی هالیبوت کبابی (روی ذغال)|Halibut, grilled|136|26.6|0|3.3|
ماهی هالیبوت سرخ‌شده در تابه|Halibut, pan-fried|169|25.4|0|7.5|
ماهی هالیبوت سرخ‌شده با آرد|Halibut, floured and fried|199|23.3|5|9.5|
ماهی هالیبوت تنوری|Halibut, oven-baked|135|26.6|0|3.2|
ماهی باس دریایی خام|Sea bass, raw|92|18.4|0|2|باس
ماهی باس دریایی آب‌پز|Sea bass, boiled|110|22.4|0|2.3|باس
ماهی باس دریایی بخارپز|Sea bass, steamed|110|22.4|0|2.3|باس
ماهی باس دریایی کبابی (روی ذغال)|Sea bass, grilled|121|23.6|0|2.9|باس
ماهی باس دریایی سرخ‌شده در تابه|Sea bass, pan-fried|154|22.4|0|7.2|باس
ماهی باس دریایی سرخ‌شده با آرد|Sea bass, floured and fried|185|20.6|5|9.2|باس
ماهی باس دریایی تنوری|Sea bass, oven-baked|121|23.6|0|2.9|باس
ماهی لاجان خام|Barramundi (lajan), raw|103|20|0|2.5|لاجان
ماهی لاجان آب‌پز|Barramundi (lajan), boiled|124|24.4|0|2.9|لاجان
ماهی لاجان بخارپز|Barramundi (lajan), steamed|124|24.4|0|2.9|لاجان
ماهی لاجان کبابی (روی ذغال)|Barramundi (lajan), grilled|134|25.6|0|3.5|لاجان
ماهی لاجان سرخ‌شده در تابه|Barramundi (lajan), pan-fried|168|24.4|0|7.8|لاجان
ماهی لاجان سرخ‌شده با آرد|Barramundi (lajan), floured and fried|198|22.4|5|9.8|لاجان
ماهی لاجان تنوری|Barramundi (lajan), oven-baked|133|25.6|0|3.4|لاجان
ماهی راشگو خام|Rashgoo (Gulf fish), raw|94|18.5|0|2.2|راشگو
ماهی راشگو آب‌پز|Rashgoo (Gulf fish), boiled|113|22.6|0|2.5|راشگو
ماهی راشگو بخارپز|Rashgoo (Gulf fish), steamed|113|22.6|0|2.5|راشگو
ماهی راشگو کبابی (روی ذغال)|Rashgoo (Gulf fish), grilled|123|23.7|0|3.1|راشگو
ماهی راشگو سرخ‌شده در تابه|Rashgoo (Gulf fish), pan-fried|157|22.6|0|7.4|راشگو
ماهی راشگو سرخ‌شده با آرد|Rashgoo (Gulf fish), floured and fried|187|20.7|5|9.4|راشگو
ماهی راشگو تنوری|Rashgoo (Gulf fish), oven-baked|123|23.7|0|3.1|راشگو
ماهی گیش خام|Trevally (gish), raw|114|20.5|0|3.5|گیش
ماهی گیش آب‌پز|Trevally (gish), boiled|136|25|0|4|گیش
ماهی گیش بخارپز|Trevally (gish), steamed|136|25|0|4|گیش
ماهی گیش کبابی (روی ذغال)|Trevally (gish), grilled|147|26.2|0|4.7|گیش
ماهی گیش سرخ‌شده در تابه|Trevally (gish), pan-fried|180|25|0|8.9|گیش
ماهی گیش سرخ‌شده با آرد|Trevally (gish), floured and fried|210|23|5|10.9|گیش
ماهی گیش تنوری|Trevally (gish), oven-baked|146|26.2|0|4.6|گیش
ماهی گیش دم‌زرد خام|Yellowtail trevally, raw|111|20.5|0|3.2|
ماهی گیش دم‌زرد آب‌پز|Yellowtail trevally, boiled|133|25|0|3.7|
ماهی گیش دم‌زرد بخارپز|Yellowtail trevally, steamed|133|25|0|3.7|
ماهی گیش دم‌زرد کبابی (روی ذغال)|Yellowtail trevally, grilled|144|26.2|0|4.3|
ماهی گیش دم‌زرد سرخ‌شده در تابه|Yellowtail trevally, pan-fried|177|25|0|8.5|
ماهی گیش دم‌زرد سرخ‌شده با آرد|Yellowtail trevally, floured and fried|207|23|5|10.5|
ماهی گیش دم‌زرد تنوری|Yellowtail trevally, oven-baked|144|26.2|0|4.3|
ماهی صافی خام|Safi fish (rabbitfish), raw|98|19|0|2.4|
ماهی صافی آب‌پز|Safi fish (rabbitfish), boiled|118|23.2|0|2.8|
ماهی صافی بخارپز|Safi fish (rabbitfish), steamed|118|23.2|0|2.8|
ماهی صافی کبابی (روی ذغال)|Safi fish (rabbitfish), grilled|128|24.3|0|3.4|
ماهی صافی سرخ‌شده در تابه|Safi fish (rabbitfish), pan-fried|161|23.2|0|7.6|
ماهی صافی سرخ‌شده با آرد|Safi fish (rabbitfish), floured and fried|192|21.3|5|9.6|
ماهی صافی تنوری|Safi fish (rabbitfish), oven-baked|127|24.3|0|3.3|
ماهی پرندگان (پرنده ماهی) خام|Flying fish, raw|83|19|0|0.8|
ماهی پرندگان (پرنده ماهی) آب‌پز|Flying fish, boiled|101|23.2|0|0.9|
ماهی پرندگان (پرنده ماهی) بخارپز|Flying fish, steamed|101|23.2|0|0.9|
ماهی پرندگان (پرنده ماهی) کبابی (روی ذغال)|Flying fish, grilled|111|24.3|0|1.5|
ماهی پرندگان (پرنده ماهی) سرخ‌شده در تابه|Flying fish, pan-fried|146|23.2|0|5.9|
ماهی پرندگان (پرنده ماهی) سرخ‌شده با آرد|Flying fish, floured and fried|176|21.3|5|7.9|
ماهی پرندگان (پرنده ماهی) تنوری|Flying fish, oven-baked|110|24.3|0|1.4|
ماهی آدم‌ماهی (دم‌شمشیر) خام|Swordfish, raw|115|19.7|0|4|شمشیر ماهی
ماهی آدم‌ماهی (دم‌شمشیر) آب‌پز|Swordfish, boiled|137|24|0|4.6|شمشیر ماهی
ماهی آدم‌ماهی (دم‌شمشیر) بخارپز|Swordfish, steamed|137|24|0|4.6|شمشیر ماهی
ماهی آدم‌ماهی (دم‌شمشیر) کبابی (روی ذغال)|Swordfish, grilled|149|25.2|0|5.3|شمشیر ماهی
ماهی آدم‌ماهی (دم‌شمشیر) سرخ‌شده در تابه|Swordfish, pan-fried|181|24|0|9.4|شمشیر ماهی
ماهی آدم‌ماهی (دم‌شمشیر) سرخ‌شده با آرد|Swordfish, floured and fried|211|22.1|5|11.4|شمشیر ماهی
ماهی آدم‌ماهی (دم‌شمشیر) تنوری|Swordfish, oven-baked|148|25.2|0|5.2|شمشیر ماهی
ماهی مارلین خام|Marlin, raw|115|23|0|2.5|
ماهی مارلین آب‌پز|Marlin, boiled|139|28.1|0|2.9|
ماهی مارلین بخارپز|Marlin, steamed|139|28.1|0|2.9|
ماهی مارلین کبابی (روی ذغال)|Marlin, grilled|149|29.4|0|3.5|
ماهی مارلین سرخ‌شده در تابه|Marlin, pan-fried|183|28.1|0|7.8|
ماهی مارلین سرخ‌شده با آرد|Marlin, floured and fried|211|25.8|5|9.8|
ماهی مارلین تنوری|Marlin, oven-baked|148|29.4|0|3.4|
ماهی کوسه خام|Shark, raw|124|20.9|0|4.5|کوسه
ماهی کوسه آب‌پز|Shark, boiled|149|25.5|0|5.2|کوسه
ماهی کوسه بخارپز|Shark, steamed|149|25.5|0|5.2|کوسه
ماهی کوسه کبابی (روی ذغال)|Shark, grilled|160|26.8|0|5.9|کوسه
ماهی کوسه سرخ‌شده در تابه|Shark, pan-fried|191|25.5|0|9.9|کوسه
ماهی کوسه سرخ‌شده با آرد|Shark, floured and fried|221|23.4|5|11.9|کوسه
ماهی کوسه تنوری|Shark, oven-baked|159|26.8|0|5.8|کوسه
ماهی سفره (راشا) خام|Skate, raw|83|19|0|0.8|
ماهی سفره (راشا) آب‌پز|Skate, boiled|101|23.2|0|0.9|
ماهی سفره (راشا) بخارپز|Skate, steamed|101|23.2|0|0.9|
ماهی سفره (راشا) کبابی (روی ذغال)|Skate, grilled|111|24.3|0|1.5|
ماهی سفره (راشا) سرخ‌شده در تابه|Skate, pan-fried|146|23.2|0|5.9|
ماهی سفره (راشا) سرخ‌شده با آرد|Skate, floured and fried|176|21.3|5|7.9|
ماهی سفره (راشا) تنوری|Skate, oven-baked|110|24.3|0|1.4|
ماهی مار (مارماهی) خام|Eel, raw|179|18.4|0|11.7|مارماهی
ماهی مار (مارماهی) آب‌پز|Eel, boiled|211|22.4|0|13.5|مارماهی
ماهی مار (مارماهی) بخارپز|Eel, steamed|211|22.4|0|13.5|مارماهی
ماهی مار (مارماهی) کبابی (روی ذغال)|Eel, grilled|225|23.6|0|14.5|مارماهی
ماهی مار (مارماهی) سرخ‌شده در تابه|Eel, pan-fried|251|22.4|0|17.9|مارماهی
ماهی مار (مارماهی) سرخ‌شده با آرد|Eel, floured and fried|282|20.6|5|19.9|مارماهی
ماهی مار (مارماهی) تنوری|Eel, oven-baked|223|23.6|0|14.3|مارماهی
ماهی ماهی‌خور (باراکودا) خام|Barracuda, raw|112|20|0|3.5|
ماهی ماهی‌خور (باراکودا) آب‌پز|Barracuda, boiled|134|24.4|0|4|
ماهی ماهی‌خور (باراکودا) بخارپز|Barracuda, steamed|134|24.4|0|4|
ماهی ماهی‌خور (باراکودا) کبابی (روی ذغال)|Barracuda, grilled|145|25.6|0|4.7|
ماهی ماهی‌خور (باراکودا) سرخ‌شده در تابه|Barracuda, pan-fried|178|24.4|0|8.9|
ماهی ماهی‌خور (باراکودا) سرخ‌شده با آرد|Barracuda, floured and fried|208|22.4|5|10.9|
ماهی ماهی‌خور (باراکودا) تنوری|Barracuda, oven-baked|144|25.6|0|4.6|
ماهی ماکرل شاه خام|King mackerel, raw|97|20.5|0|1.7|
ماهی ماکرل شاه آب‌پز|King mackerel, boiled|118|25|0|2|
ماهی ماکرل شاه بخارپز|King mackerel, steamed|118|25|0|2|
ماهی ماکرل شاه کبابی (روی ذغال)|King mackerel, grilled|127|26.2|0|2.5|
ماهی ماکرل شاه سرخ‌شده در تابه|King mackerel, pan-fried|162|25|0|6.9|
ماهی ماکرل شاه سرخ‌شده با آرد|King mackerel, floured and fried|192|23|5|8.9|
ماهی ماکرل شاه تنوری|King mackerel, oven-baked|127|26.2|0|2.5|
ماهی بوری خام|Boori mullet, raw|110|19|0|3.8|
ماهی بوری آب‌پز|Boori mullet, boiled|132|23.2|0|4.4|
ماهی بوری بخارپز|Boori mullet, steamed|132|23.2|0|4.4|
ماهی بوری کبابی (روی ذغال)|Boori mullet, grilled|143|24.3|0|5.1|
ماهی بوری سرخ‌شده در تابه|Boori mullet, pan-fried|176|23.2|0|9.2|
ماهی بوری سرخ‌شده با آرد|Boori mullet, floured and fried|206|21.3|5|11.2|
ماهی بوری تنوری|Boori mullet, oven-baked|142|24.3|0|5|
ماهی شمشیری خام|Needlefish, raw|94|20|0|1.5|
ماهی شمشیری آب‌پز|Needlefish, boiled|113|24.4|0|1.7|
ماهی شمشیری بخارپز|Needlefish, steamed|113|24.4|0|1.7|
ماهی شمشیری کبابی (روی ذغال)|Needlefish, grilled|123|25.6|0|2.3|
ماهی شمشیری سرخ‌شده در تابه|Needlefish, pan-fried|158|24.4|0|6.7|
ماهی شمشیری سرخ‌شده با آرد|Needlefish, floured and fried|188|22.4|5|8.7|
ماهی شمشیری تنوری|Needlefish, oven-baked|123|25.6|0|2.3|
ماهی سیم خام|Bream (sim), raw|99|18|0|3|
ماهی سیم آب‌پز|Bream (sim), boiled|119|22|0|3.4|
ماهی سیم بخارپز|Bream (sim), steamed|119|22|0|3.4|
ماهی سیم کبابی (روی ذغال)|Bream (sim), grilled|129|23|0|4.1|
ماهی سیم سرخ‌شده در تابه|Bream (sim), pan-fried|163|22|0|8.3|
ماهی سیم سرخ‌شده با آرد|Bream (sim), floured and fried|194|20.2|5|10.3|
ماهی سیم تنوری|Bream (sim), oven-baked|128|23|0|4|
ماهی سفید دریاچه (لیک وایت‌فیش) خام|Lake whitefish, raw|130|19.1|0|5.9|
ماهی سفید دریاچه (لیک وایت‌فیش) آب‌پز|Lake whitefish, boiled|154|23.3|0|6.8|
ماهی سفید دریاچه (لیک وایت‌فیش) بخارپز|Lake whitefish, steamed|154|23.3|0|6.8|
ماهی سفید دریاچه (لیک وایت‌فیش) کبابی (روی ذغال)|Lake whitefish, grilled|166|24.4|0|7.6|
ماهی سفید دریاچه (لیک وایت‌فیش) سرخ‌شده در تابه|Lake whitefish, pan-fried|197|23.3|0|11.5|
ماهی سفید دریاچه (لیک وایت‌فیش) سرخ‌شده با آرد|Lake whitefish, floured and fried|227|21.4|5|13.5|
ماهی سفید دریاچه (لیک وایت‌فیش) تنوری|Lake whitefish, oven-baked|165|24.4|0|7.5|
ماهی اوراتا خام|Orata, raw|106|20|0|2.9|
ماهی اوراتا آب‌پز|Orata, boiled|127|24.4|0|3.3|
ماهی اوراتا بخارپز|Orata, steamed|127|24.4|0|3.3|
ماهی اوراتا کبابی (روی ذغال)|Orata, grilled|138|25.6|0|4|
ماهی اوراتا سرخ‌شده در تابه|Orata, pan-fried|171|24.4|0|8.2|
ماهی اوراتا سرخ‌شده با آرد|Orata, floured and fried|201|22.4|5|10.2|
ماهی اوراتا تنوری|Orata, oven-baked|138|25.6|0|3.9|
ماهی شیربت خام|Shirbit barbel, raw|113|17|0|5|شیربت
ماهی شیربت آب‌پز|Shirbit barbel, boiled|135|20.7|0|5.8|شیربت
ماهی شیربت بخارپز|Shirbit barbel, steamed|135|20.7|0|5.8|شیربت
ماهی شیربت کبابی (روی ذغال)|Shirbit barbel, grilled|146|21.8|0|6.5|شیربت
ماهی شیربت سرخ‌شده در تابه|Shirbit barbel, pan-fried|177|20.7|0|10.5|شیربت
ماهی شیربت سرخ‌شده با آرد|Shirbit barbel, floured and fried|209|19|5|12.5|شیربت
ماهی شیربت تنوری|Shirbit barbel, oven-baked|145|21.8|0|6.4|شیربت
ماهی بنی خام|Bunni barbel, raw|111|17.5|0|4.5|بنی
ماهی بنی آب‌پز|Bunni barbel, boiled|132|21.3|0|5.2|بنی
ماهی بنی بخارپز|Bunni barbel, steamed|132|21.3|0|5.2|بنی
ماهی بنی کبابی (روی ذغال)|Bunni barbel, grilled|143|22.4|0|5.9|بنی
ماهی بنی سرخ‌شده در تابه|Bunni barbel, pan-fried|174|21.3|0|9.9|بنی
ماهی بنی سرخ‌شده با آرد|Bunni barbel, floured and fried|206|19.6|5|11.9|بنی
ماهی بنی تنوری|Bunni barbel, oven-baked|142|22.4|0|5.8|بنی
ماهی پیکه (پایک شمالی) خام|Northern pike, raw|82|18.8|0|0.7|
ماهی پیکه (پایک شمالی) آب‌پز|Northern pike, boiled|99|22.9|0|0.8|
ماهی پیکه (پایک شمالی) بخارپز|Northern pike, steamed|99|22.9|0|0.8|
ماهی پیکه (پایک شمالی) کبابی (روی ذغال)|Northern pike, grilled|108|24.1|0|1.3|
ماهی پیکه (پایک شمالی) سرخ‌شده در تابه|Northern pike, pan-fried|144|22.9|0|5.8|
ماهی پیکه (پایک شمالی) سرخ‌شده با آرد|Northern pike, floured and fried|175|21.1|5|7.8|
ماهی پیکه (پایک شمالی) تنوری|Northern pike, oven-baked|108|24.1|0|1.3|
ماهی خاردار (پرچ) خام|Perch, raw|84|19|0|0.9|
ماهی خاردار (پرچ) آب‌پز|Perch, boiled|102|23.2|0|1|
ماهی خاردار (پرچ) بخارپز|Perch, steamed|102|23.2|0|1|
ماهی خاردار (پرچ) کبابی (روی ذغال)|Perch, grilled|112|24.3|0|1.6|
ماهی خاردار (پرچ) سرخ‌شده در تابه|Perch, pan-fried|147|23.2|0|6|
ماهی خاردار (پرچ) سرخ‌شده با آرد|Perch, floured and fried|177|21.3|5|8|
ماهی خاردار (پرچ) تنوری|Perch, oven-baked|112|24.3|0|1.6|
ماهی دلفین (ماهی‌ماهی) خام|Mahi-mahi, raw|80|18.5|0|0.7|ماهی ماهی
ماهی دلفین (ماهی‌ماهی) آب‌پز|Mahi-mahi, boiled|98|22.6|0|0.8|ماهی ماهی
ماهی دلفین (ماهی‌ماهی) بخارپز|Mahi-mahi, steamed|98|22.6|0|0.8|ماهی ماهی
ماهی دلفین (ماهی‌ماهی) کبابی (روی ذغال)|Mahi-mahi, grilled|107|23.7|0|1.3|ماهی ماهی
ماهی دلفین (ماهی‌ماهی) سرخ‌شده در تابه|Mahi-mahi, pan-fried|143|22.6|0|5.8|ماهی ماهی
ماهی دلفین (ماهی‌ماهی) سرخ‌شده با آرد|Mahi-mahi, floured and fried|173|20.7|5|7.8|ماهی ماهی
ماهی دلفین (ماهی‌ماهی) تنوری|Mahi-mahi, oven-baked|107|23.7|0|1.3|ماهی ماهی
ماهی رنگین‌کمان کوچک خام|Small trout, raw|110|20|0|3.3|
ماهی رنگین‌کمان کوچک آب‌پز|Small trout, boiled|132|24.4|0|3.8|
ماهی رنگین‌کمان کوچک بخارپز|Small trout, steamed|132|24.4|0|3.8|
ماهی رنگین‌کمان کوچک کبابی (روی ذغال)|Small trout, grilled|143|25.6|0|4.5|
ماهی رنگین‌کمان کوچک سرخ‌شده در تابه|Small trout, pan-fried|175|24.4|0|8.6|
ماهی رنگین‌کمان کوچک سرخ‌شده با آرد|Small trout, floured and fried|205|22.4|5|10.6|
ماهی رنگین‌کمان کوچک تنوری|Small trout, oven-baked|142|25.6|0|4.4|
ماهی آزاد دودی|Smoked salmon|112|18.3|0|4.3|
ماهی قزل‌آلا دودی|Smoked trout|149|22.5|0|6.5|
ماهی سفید دودی|Smoked white fish|119|23|0|3|
ماهی کپور دودی|Smoked carp|168|24|0|8|
ماهی خاویاری دودی|Smoked sturgeon|163|25|0|7|
ماهی ماکرل دودی|Smoked mackerel|267|24|0|19|
ماهی ساردین دودی|Smoked sardine|204|24|0|12|
ماهی کیلکا دودی|Smoked kilka|181|25|0|9|
ماهی هامور دودی|Smoked grouper|114|24|0|2|
ماهی تن دودی|Smoked tuna|130|28|0|2|
ماهی سفید شور|Salted kutum|166|28|0|6|
ماهی کیلکا نمک‌سود|Salted kilka|142|22|0|6|
ماهی ساردین نمک‌سود|Salted sardine|191|23|0|11|
ماهی شور (سفید نمک‌سود)|Salted white fish|144|27|0|4|
ماهی خشک‌شده (کاد خشک)|Dried cod|273|62.8|0|2.4|
ماهی کیلکا خشک|Dried kilka|312|60|0|8|
ماهی ساردین خشک|Dried sardine|328|55|0|12|
میگوی خشک|Dried shrimp|239|54|0|2.5|
ماهی تن کنسرو در روغن زیتون|Canned tuna in olive oil|216|27|0|12|
ماهی تن کنسرو در سس گوجه|Canned tuna in tomato sauce|129|17|4|5|
ماهی تن کنسرو نمکی کم‌نمک|Canned tuna, low sodium|113|26|0|1|
ماهی ساردین کنسرو در روغن|Canned sardines in oil|202|24.6|0|11.5|
ماهی ساردین کنسرو در سس گوجه|Canned sardines in tomato sauce|169|17.5|1|10.5|
ماهی ساردین کنسرو در آب|Canned sardines in water|151|22|0|7|
ماهی ماکرل کنسرو در سس گوجه|Canned mackerel in tomato sauce|166|17|3|9.5|
ماهی آزاد کنسرو|Canned salmon|150|23.2|0|6.4|
ماهی آزاد صورتی کنسرو|Canned pink salmon|136|20.5|0|6|
ماهی کیلکا کنسرو|Canned kilka|157|18|1|9|
ماهی کیلکا کنسرو در سس گوجه|Canned kilka in tomato sauce|148|16|3|8|
ماهی انچووی کنسرو|Canned anchovies|203|28.9|0|9.7|
ماهی آنچوی تازه|Fresh anchovy|125|20.4|0|4.8|
ماهی کاد کنسرو|Canned cod|97|22|0|1|
ماهی هرینگ ترشی|Pickled herring|227|14|9|15|
ماهی هرینگ تازه|Fresh herring|153|18|0|9|
ماهی هرینگ دودی|Smoked herring|226|25|0|14|
ماهی دودی (کیپر)|Kippered herring|208|25|0|12|
خاویار ایرانی (ایکرا)|Sturgeon caviar|276|24.6|4|17.9|خاویار
خاویار قرمز (ماهی آزاد)|Salmon roe (red caviar)|277|25.4|3.5|17.9|
تخم ماهی (ماهی سفید)|Whitefish roe|125|20|0|5|تخم ماهی
تخم ماهی سرخ‌شده|Fried fish roe|190|24|1|10|
کله ماهی|Fish head|131|17|0|7|
جگر ماهی کاد|Cod liver|600|4.8|1.2|64|
روغن جگر ماهی کاد|Cod liver oil|902|0|0|100|
سوشی ماهی تن (ساشیمی)|Tuna sashimi|113|26|0|1|
ساشیمی ماهی آزاد|Salmon sashimi|197|20|0|13|
ماهی سرخ‌شده خمیری (فیش اند چیپس)|Battered fried fish|242|15|14|14|فیش اند چیپس
انگشتی ماهی (فیش فینگر)|Fish sticks|227|12|20|11|فیش فینگر
پاته ماهی|Fish pate|198|15|3|14|
سس ماهی (فیش ساس)|Fish sauce|35|5|4|0|
ماهی تن آب‌پز در آب نمک|Tuna in brine|107|24.5|0|1|
میگوی ریز خام|Small shrimp, raw|86|20.1|0.2|0.5|میگو
میگوی ریز آب‌پز|Small shrimp, boiled|103|24.1|0.2|0.6|میگو
میگوی ریز بخارپز|Small shrimp, steamed|103|24.1|0.2|0.6|میگو
میگوی ریز کبابی|Small shrimp, grilled|116|25.1|0.2|1.6|میگو
میگوی ریز سرخ‌شده در تابه|Small shrimp, pan-fried|147|24.1|0.2|5.5|میگو
میگوی ریز سرخ‌شده با آرد (پوشش‌دار)|Small shrimp, breaded and fried|219|20.1|15.2|8.6|میگو
میگوی متوسط خام|Medium shrimp, raw|86|20.1|0.2|0.5|
میگوی متوسط آب‌پز|Medium shrimp, boiled|103|24.1|0.2|0.6|
میگوی متوسط بخارپز|Medium shrimp, steamed|103|24.1|0.2|0.6|
میگوی متوسط کبابی|Medium shrimp, grilled|116|25.1|0.2|1.6|
میگوی متوسط سرخ‌شده در تابه|Medium shrimp, pan-fried|147|24.1|0.2|5.5|
میگوی متوسط سرخ‌شده با آرد (پوشش‌دار)|Medium shrimp, breaded and fried|219|20.1|15.2|8.6|
میگوی درشت خام|Large shrimp, raw|86|20.1|0.2|0.5|
میگوی درشت آب‌پز|Large shrimp, boiled|103|24.1|0.2|0.6|
میگوی درشت بخارپز|Large shrimp, steamed|103|24.1|0.2|0.6|
میگوی درشت کبابی|Large shrimp, grilled|116|25.1|0.2|1.6|
میگوی درشت سرخ‌شده در تابه|Large shrimp, pan-fried|147|24.1|0.2|5.5|
میگوی درشت سرخ‌شده با آرد (پوشش‌دار)|Large shrimp, breaded and fried|219|20.1|15.2|8.6|
میگوی جامبو خام|Jumbo shrimp, raw|86|20.1|0.2|0.5|
میگوی جامبو آب‌پز|Jumbo shrimp, boiled|103|24.1|0.2|0.6|
میگوی جامبو بخارپز|Jumbo shrimp, steamed|103|24.1|0.2|0.6|
میگوی جامبو کبابی|Jumbo shrimp, grilled|116|25.1|0.2|1.6|
میگوی جامبو سرخ‌شده در تابه|Jumbo shrimp, pan-fried|147|24.1|0.2|5.5|
میگوی جامبو سرخ‌شده با آرد (پوشش‌دار)|Jumbo shrimp, breaded and fried|219|20.1|15.2|8.6|
میگوی ببری خام|Tiger shrimp, raw|87|20.3|0.2|0.6|
میگوی ببری آب‌پز|Tiger shrimp, boiled|105|24.4|0.2|0.7|
میگوی ببری بخارپز|Tiger shrimp, steamed|105|24.4|0.2|0.7|
میگوی ببری کبابی|Tiger shrimp, grilled|118|25.4|0.2|1.7|
میگوی ببری سرخ‌شده در تابه|Tiger shrimp, pan-fried|150|24.4|0.2|5.7|
میگوی ببری سرخ‌شده با آرد (پوشش‌دار)|Tiger shrimp, breaded and fried|220|20.3|15.2|8.7|
میگوی سفید خام|White shrimp, raw|86|20.1|0.2|0.5|
میگوی سفید آب‌پز|White shrimp, boiled|103|24.1|0.2|0.6|
میگوی سفید بخارپز|White shrimp, steamed|103|24.1|0.2|0.6|
میگوی سفید کبابی|White shrimp, grilled|116|25.1|0.2|1.6|
میگوی سفید سرخ‌شده در تابه|White shrimp, pan-fried|147|24.1|0.2|5.5|
میگوی سفید سرخ‌شده با آرد (پوشش‌دار)|White shrimp, breaded and fried|219|20.1|15.2|8.6|
میگوی صورتی خلیج خام|Pink Gulf shrimp, raw|86|20.1|0.2|0.5|
میگوی صورتی خلیج آب‌پز|Pink Gulf shrimp, boiled|103|24.1|0.2|0.6|
میگوی صورتی خلیج بخارپز|Pink Gulf shrimp, steamed|103|24.1|0.2|0.6|
میگوی صورتی خلیج کبابی|Pink Gulf shrimp, grilled|116|25.1|0.2|1.6|
میگوی صورتی خلیج سرخ‌شده در تابه|Pink Gulf shrimp, pan-fried|147|24.1|0.2|5.5|
میگوی صورتی خلیج سرخ‌شده با آرد (پوشش‌دار)|Pink Gulf shrimp, breaded and fried|219|20.1|15.2|8.6|
میگوی سیاه خام|Black shrimp, raw|86|20|0.2|0.6|
میگوی سیاه آب‌پز|Black shrimp, boiled|103|24|0.2|0.7|
میگوی سیاه بخارپز|Black shrimp, steamed|103|24|0.2|0.7|
میگوی سیاه کبابی|Black shrimp, grilled|116|25|0.2|1.7|
میگوی سیاه سرخ‌شده در تابه|Black shrimp, pan-fried|148|24|0.2|5.7|
میگوی سیاه سرخ‌شده با آرد (پوشش‌دار)|Black shrimp, breaded and fried|219|20|15.2|8.7|
میگوی خلیج فارس (جامبو) خام|Persian Gulf shrimp, raw|89|20.4|0.2|0.7|
میگوی خلیج فارس (جامبو) آب‌پز|Persian Gulf shrimp, boiled|106|24.5|0.2|0.8|
میگوی خلیج فارس (جامبو) بخارپز|Persian Gulf shrimp, steamed|106|24.5|0.2|0.8|
میگوی خلیج فارس (جامبو) کبابی|Persian Gulf shrimp, grilled|119|25.5|0.2|1.8|
میگوی خلیج فارس (جامبو) سرخ‌شده در تابه|Persian Gulf shrimp, pan-fried|151|24.5|0.2|5.8|
میگوی خلیج فارس (جامبو) سرخ‌شده با آرد (پوشش‌دار)|Persian Gulf shrimp, breaded and fried|222|20.4|15.2|8.8|
میگوی پرورشی خام|Farmed shrimp, raw|89|19.5|0.2|1.1|
میگوی پرورشی آب‌پز|Farmed shrimp, boiled|105|23.4|0.2|1.2|
میگوی پرورشی بخارپز|Farmed shrimp, steamed|105|23.4|0.2|1.2|
میگوی پرورشی کبابی|Farmed shrimp, grilled|119|24.4|0.2|2.3|
میگوی پرورشی سرخ‌شده در تابه|Farmed shrimp, pan-fried|150|23.4|0.2|6.2|
میگوی پرورشی سرخ‌شده با آرد (پوشش‌دار)|Farmed shrimp, breaded and fried|222|19.5|15.2|9.2|
میگوی ماهی‌گیری (دریایی) خام|Wild-caught shrimp, raw|88|20.6|0.2|0.5|
میگوی ماهی‌گیری (دریایی) آب‌پز|Wild-caught shrimp, boiled|105|24.7|0.2|0.6|
میگوی ماهی‌گیری (دریایی) بخارپز|Wild-caught shrimp, steamed|105|24.7|0.2|0.6|
میگوی ماهی‌گیری (دریایی) کبابی|Wild-caught shrimp, grilled|118|25.8|0.2|1.6|
میگوی ماهی‌گیری (دریایی) سرخ‌شده در تابه|Wild-caught shrimp, pan-fried|149|24.7|0.2|5.5|
میگوی ماهی‌گیری (دریایی) سرخ‌شده با آرد (پوشش‌دار)|Wild-caught shrimp, breaded and fried|221|20.6|15.2|8.6|
لابستر خام|Lobster, raw|87|19|0.6|0.9|خرچنگ دراز
لابستر آب‌پز|Lobster, boiled|103|22.8|0.6|1|خرچنگ دراز
لابستر بخارپز|Lobster, steamed|103|22.8|0.6|1|خرچنگ دراز
لابستر کبابی|Lobster, grilled|116|23.8|0.6|2|خرچنگ دراز
لابستر سرخ‌شده در تابه|Lobster, pan-fried|148|22.8|0.6|6|خرچنگ دراز
لابستر سرخ‌شده با آرد (پوشش‌دار)|Lobster, breaded and fried|219|19|15.6|9|خرچنگ دراز
لابستر دم خام|Lobster tail, raw|90|20|0.3|1|
لابستر دم آب‌پز|Lobster tail, boiled|107|24|0.3|1.1|
لابستر دم بخارپز|Lobster tail, steamed|107|24|0.3|1.1|
لابستر دم کبابی|Lobster tail, grilled|120|25|0.3|2.1|
لابستر دم سرخ‌شده در تابه|Lobster tail, pan-fried|152|24|0.3|6.1|
لابستر دم سرخ‌شده با آرد (پوشش‌دار)|Lobster tail, breaded and fried|223|20|15.3|9.1|
خرچنگ آبی خام|Blue crab, raw|83|18.1|0.1|1.1|
خرچنگ آبی آب‌پز|Blue crab, boiled|98|21.7|0.1|1.2|
خرچنگ آبی بخارپز|Blue crab, steamed|98|21.7|0.1|1.2|
خرچنگ آبی کبابی|Blue crab, grilled|112|22.6|0.1|2.3|
خرچنگ آبی سرخ‌شده در تابه|Blue crab, pan-fried|143|21.7|0.1|6.2|
خرچنگ آبی سرخ‌شده با آرد (پوشش‌دار)|Blue crab, breaded and fried|216|18.1|15.1|9.2|
خرچنگ شاه خام|King crab, raw|87|18.3|0|1.5|
خرچنگ شاه آب‌پز|King crab, boiled|103|22|0|1.7|
خرچنگ شاه بخارپز|King crab, steamed|103|22|0|1.7|
خرچنگ شاه کبابی|King crab, grilled|116|22.9|0|2.7|
خرچنگ شاه سرخ‌شده در تابه|King crab, pan-fried|148|22|0|6.7|
خرچنگ شاه سرخ‌شده با آرد (پوشش‌دار)|King crab, breaded and fried|221|18.3|15|9.7|
گوشت خرچنگ کنسروی خام|Canned crab meat, raw|79|17.9|0|0.8|
گوشت خرچنگ کنسروی آب‌پز|Canned crab meat, boiled|94|21.5|0|0.9|
گوشت خرچنگ کنسروی بخارپز|Canned crab meat, steamed|94|21.5|0|0.9|
گوشت خرچنگ کنسروی کبابی|Canned crab meat, grilled|107|22.4|0|1.9|
گوشت خرچنگ کنسروی سرخ‌شده در تابه|Canned crab meat, pan-fried|139|21.5|0|5.9|
گوشت خرچنگ کنسروی سرخ‌شده با آرد (پوشش‌دار)|Canned crab meat, breaded and fried|212|17.9|15|8.9|
خرچنگ دانجنس خام|Dungeness crab, raw|82|17.4|0.8|1|
خرچنگ دانجنس آب‌پز|Dungeness crab, boiled|97|20.9|0.8|1.1|
خرچنگ دانجنس بخارپز|Dungeness crab, steamed|97|20.9|0.8|1.1|
خرچنگ دانجنس کبابی|Dungeness crab, grilled|109|21.8|0.8|2.1|
خرچنگ دانجنس سرخ‌شده در تابه|Dungeness crab, pan-fried|142|20.9|0.8|6.1|
خرچنگ دانجنس سرخ‌شده با آرد (پوشش‌دار)|Dungeness crab, breaded and fried|215|17.4|15.8|9.1|
ماهی مرکب (ماهی‌مرکب) خام|Squid, raw|89|15.6|3.4|1.4|اسکوئید؛کالامار
ماهی مرکب (ماهی‌مرکب) آب‌پز|Squid, boiled|102|18.7|3.4|1.5|اسکوئید؛کالامار
ماهی مرکب (ماهی‌مرکب) بخارپز|Squid, steamed|102|18.7|3.4|1.5|اسکوئید؛کالامار
ماهی مرکب (ماهی‌مرکب) کبابی|Squid, grilled|115|19.5|3.4|2.6|اسکوئید؛کالامار
ماهی مرکب (ماهی‌مرکب) سرخ‌شده در تابه|Squid, pan-fried|147|18.7|3.4|6.5|اسکوئید؛کالامار
ماهی مرکب (ماهی‌مرکب) سرخ‌شده با آرد (پوشش‌دار)|Squid, breaded and fried|222|15.6|18.4|9.5|اسکوئید؛کالامار
هشت‌پا خام|Octopus, raw|78|14.9|2.4|1|
هشت‌پا آب‌پز|Octopus, boiled|91|17.9|2.4|1.1|
هشت‌پا بخارپز|Octopus, steamed|91|17.9|2.4|1.1|
هشت‌پا کبابی|Octopus, grilled|103|18.6|2.4|2.1|
هشت‌پا سرخ‌شده در تابه|Octopus, pan-fried|136|17.9|2.4|6.1|
هشت‌پا سرخ‌شده با آرد (پوشش‌دار)|Octopus, breaded and fried|211|14.9|17.4|9.1|
ماهی مرکب بزرگ (کتل‌فیش) خام|Cuttlefish, raw|75|16.2|0.9|0.7|
ماهی مرکب بزرگ (کتل‌فیش) آب‌پز|Cuttlefish, boiled|88|19.4|0.9|0.8|
ماهی مرکب بزرگ (کتل‌فیش) بخارپز|Cuttlefish, steamed|88|19.4|0.9|0.8|
ماهی مرکب بزرگ (کتل‌فیش) کبابی|Cuttlefish, grilled|101|20.3|0.9|1.8|
ماهی مرکب بزرگ (کتل‌فیش) سرخ‌شده در تابه|Cuttlefish, pan-fried|133|19.4|0.9|5.8|
ماهی مرکب بزرگ (کتل‌فیش) سرخ‌شده با آرد (پوشش‌دار)|Cuttlefish, breaded and fried|208|16.2|15.9|8.8|
صدف ماسل (مولد) خام|Mussels, raw|84|11.9|4.1|2.2|
صدف ماسل (مولد) آب‌پز|Mussels, boiled|95|14.3|4.1|2.4|
صدف ماسل (مولد) بخارپز|Mussels, steamed|95|14.3|4.1|2.4|
صدف ماسل (مولد) کبابی|Mussels, grilled|108|14.9|4.1|3.5|
صدف ماسل (مولد) سرخ‌شده در تابه|Mussels, pan-fried|140|14.3|4.1|7.4|
صدف ماسل (مولد) سرخ‌شده با آرد (پوشش‌دار)|Mussels, breaded and fried|218|11.9|19.1|10.4|
صدف خوراکی (اویستر) خام|Oyster, raw|68|7.1|4.3|2.5|اویستر
صدف خوراکی (اویستر) آب‌پز|Oyster, boiled|76|8.5|4.3|2.8|اویستر
صدف خوراکی (اویستر) بخارپز|Oyster, steamed|76|8.5|4.3|2.8|اویستر
صدف خوراکی (اویستر) کبابی|Oyster, grilled|88|8.9|4.3|3.9|اویستر
صدف خوراکی (اویستر) سرخ‌شده در تابه|Oyster, pan-fried|121|8.5|4.3|7.8|اویستر
صدف خوراکی (اویستر) سرخ‌شده با آرد (پوشش‌دار)|Oyster, breaded and fried|203|7.1|19.3|10.8|اویستر
صدف اسکالوپ خام|Scallop, raw|67|12.1|3.5|0.5|
صدف اسکالوپ آب‌پز|Scallop, boiled|77|14.5|3.5|0.6|
صدف اسکالوپ بخارپز|Scallop, steamed|77|14.5|3.5|0.6|
صدف اسکالوپ کبابی|Scallop, grilled|89|15.1|3.5|1.6|
صدف اسکالوپ سرخ‌شده در تابه|Scallop, pan-fried|122|14.5|3.5|5.5|
صدف اسکالوپ سرخ‌شده با آرد (پوشش‌دار)|Scallop, breaded and fried|200|12.1|18.5|8.6|
صدف خوراکی (کلم) خام|Clams, raw|76|12.8|4|1|
صدف خوراکی (کلم) آب‌پز|Clams, boiled|88|15.4|4|1.1|
صدف خوراکی (کلم) بخارپز|Clams, steamed|88|15.4|4|1.1|
صدف خوراکی (کلم) کبابی|Clams, grilled|99|16|4|2.1|
صدف خوراکی (کلم) سرخ‌شده در تابه|Clams, pan-fried|133|15.4|4|6.1|
صدف خوراکی (کلم) سرخ‌شده با آرد (پوشش‌دار)|Clams, breaded and fried|209|12.8|19|9.1|
حلزون دریایی خام|Sea snail, raw|76|15|2.2|0.8|
حلزون دریایی آب‌پز|Sea snail, boiled|89|18|2.2|0.9|
حلزون دریایی بخارپز|Sea snail, steamed|89|18|2.2|0.9|
حلزون دریایی کبابی|Sea snail, grilled|101|18.8|2.2|1.9|
حلزون دریایی سرخ‌شده در تابه|Sea snail, pan-fried|134|18|2.2|5.9|
حلزون دریایی سرخ‌شده با آرد (پوشش‌دار)|Sea snail, breaded and fried|209|15|17.2|8.9|
حلزون خوراکی خام|Edible snail, raw|86|16.1|2.2|1.4|
حلزون خوراکی آب‌پز|Edible snail, boiled|100|19.3|2.2|1.5|
حلزون خوراکی بخارپز|Edible snail, steamed|100|19.3|2.2|1.5|
حلزون خوراکی کبابی|Edible snail, grilled|113|20.1|2.2|2.6|
حلزون خوراکی سرخ‌شده در تابه|Edible snail, pan-fried|145|19.3|2.2|6.5|
حلزون خوراکی سرخ‌شده با آرد (پوشش‌دار)|Edible snail, breaded and fried|219|16.1|17.2|9.5|
خیار دریایی خام|Sea cucumber, raw|70|16.5|0|0.4|
خیار دریایی آب‌پز|Sea cucumber, boiled|83|19.8|0|0.4|
خیار دریایی بخارپز|Sea cucumber, steamed|83|19.8|0|0.4|
خیار دریایی کبابی|Sea cucumber, grilled|96|20.6|0|1.5|
خیار دریایی سرخ‌شده در تابه|Sea cucumber, pan-fried|128|19.8|0|5.4|
خیار دریایی سرخ‌شده با آرد (پوشش‌دار)|Sea cucumber, breaded and fried|202|16.5|15|8.4|
اورچین دریایی (خارپشت دریایی) خام|Sea urchin, raw|110|13.2|3.6|4.8|
اورچین دریایی (خارپشت دریایی) آب‌پز|Sea urchin, boiled|125|15.8|3.6|5.3|
اورچین دریایی (خارپشت دریایی) بخارپز|Sea urchin, steamed|125|15.8|3.6|5.3|
اورچین دریایی (خارپشت دریایی) کبابی|Sea urchin, grilled|139|16.5|3.6|6.5|
اورچین دریایی (خارپشت دریایی) سرخ‌شده در تابه|Sea urchin, pan-fried|170|15.8|3.6|10.3|
اورچین دریایی (خارپشت دریایی) سرخ‌شده با آرد (پوشش‌دار)|Sea urchin, breaded and fried|247|13.2|18.6|13.3|
ماهی‌مرکب خشک خام|Dried squid, raw|311|60|8.8|4|
خرچنگ نقلی (میکس) خام|Crab mix, raw|83|17|1.1|1.2|
خرچنگ نقلی (میکس) آب‌پز|Crab mix, boiled|98|20.4|1.1|1.3|
خرچنگ نقلی (میکس) بخارپز|Crab mix, steamed|98|20.4|1.1|1.3|
خرچنگ نقلی (میکس) کبابی|Crab mix, grilled|111|21.3|1.1|2.4|
خرچنگ نقلی (میکس) سرخ‌شده در تابه|Crab mix, pan-fried|143|20.4|1.1|6.3|
خرچنگ نقلی (میکس) سرخ‌شده با آرد (پوشش‌دار)|Crab mix, breaded and fried|216|17|16.1|9.3|
`;
const ING_EGGS = `
تخم‌مرغ خام کامل|Whole chicken egg, raw|139|12.6|0.7|9.5|تخم مرغ
سفیده تخم‌مرغ خام|Egg white, raw|48|10.9|0.7|0.2|سفیده
زرده تخم‌مرغ خام|Egg yolk, raw|317|15.9|3.6|26.5|زرده
تخم‌مرغ آب‌پز سفت|Hard-boiled egg|150|12.6|1.1|10.6|تخم مرغ آبپز;تخم مرغ پخته
سفیده تخم‌مرغ آب‌پز|Hard-boiled egg white|48|10.9|0.7|0.2|
زرده تخم‌مرغ آب‌پز|Hard-boiled egg yolk|317|15.9|3.6|26.5|
تخم‌مرغ نیمرو شده با روغن|Fried egg in oil|195|13.6|0.8|15.3|نیمرو
تخم‌مرغ نیمرو شده با کره|Fried egg in butter|197|13.6|0.8|15.5|
تخم‌مرغ نیمرو شده بدون چربی (تابه نچسب)|Egg fried without fat|152|12.9|0.9|10.8|
تخم‌مرغ نیمرو شده با روغن زیتون|Egg fried in olive oil|192|13.4|0.8|15|
تخم‌مرغ عسلی (نیمبرو، بدون زرده سفت)|Soft-boiled egg|142|12.5|0.7|9.9|تخم مرغ نیمبرو
تخم‌مرغ آب‌پز نیم‌پز (شش دقیقه)|Six-minute egg|144|12.6|0.8|10|
تخم‌مرغ پوچ (آب‌پز بدون پوست)|Poached egg|144|12.5|0.9|10|پوچ اگ
املت ساده با تخم‌مرغ|Plain omelet|159|10.5|1.2|12.5|املت
املت با شیر|Omelet with milk|141|9.5|2|10.5|
املت با پنیر|Cheese omelet|195|12.5|1.4|15.5|
املت گوجه (نیمرو گوجه)|Tomato omelet|125|7.5|4.5|8.5|املت گوجه فرنگی
املت سفیده تخم‌مرغ|Egg white omelet|73|10|1.5|3|
تخم‌مرغ هم‌زده (اسکرمبل) با کره|Scrambled egg with butter|168|10.5|2.2|13|اسکرمبل
تخم‌مرغ هم‌زده (اسکرمبل) با شیر|Scrambled egg with milk|146|10|2.8|10.5|
تخم‌مرغ هم‌زده (اسکرمبل) با روغن|Scrambled egg in oil|161|10.5|1.6|12.5|
تخم‌مرغ هم‌زده (اسکرمبل) کم‌چرب|Low-fat scrambled egg|102|10.5|1.5|6|
خاگینه ساده|Persian sweet egg omelet (khagineh)|167|9|8|11|خاگینه
کوکو تخم‌مرغ ساده|Plain egg kuku|141|9.5|2|10.5|
تخم‌مرغ آب‌پز نمک‌سود|Salted boiled egg|150|12.6|1.1|10.6|
تخم‌مرغ ترشی (آب‌پز در سرکه)|Pickled egg|131|12|1.5|8.5|
تخم‌مرغ چای (آب‌پز ادویه‌دار)|Tea egg|151|12.6|1.2|10.6|
تخم‌مرغ آب‌پز با پوست (کامل)|Boiled egg, whole with shell weight|132|11|1|9.3|
تخم‌مرغ تنوری (بیکد)|Baked egg|149|12.5|1|10.5|
تخم‌مرغ شکسته تنوری با گوجه (شکشوکا)|Shakshuka|122|7.5|5|8|شکشوکا
تخم‌مرغ مایع پاستوریزه|Pasteurized liquid egg|138|12.4|0.7|9.5|
پودر تخم‌مرغ کامل|Whole egg powder|583|47.5|4.1|41.8|
پودر سفیده تخم‌مرغ|Egg white powder|357|81.1|7.8|0.2|
پودر زرده تخم‌مرغ|Egg yolk powder|639|31|5|55|
جایگزین تخم‌مرغ (گیاهی)|Egg replacer|288|30|15|12|
مرنگ (شیرینی سفیده تخم‌مرغ)|Meringue|333|3|80|0.1|
تخم‌مرغ محلی خام کامل|Free-range egg, raw|144|12.8|0.7|10|
تخم‌مرغ محلی آب‌پز|Free-range egg, boiled|155|12.9|1.1|11|
تخم‌مرغ غنی‌شده با امگا 3 خام|Omega-3 enriched egg, raw|138|12.5|0.7|9.5|
تخم‌مرغ غنی‌شده با امگا 3 آب‌پز|Omega-3 enriched egg, boiled|149|12.6|1.1|10.5|
تخم بلدرچین خام|Quail egg, raw|154|13.1|0.4|11.1|
تخم بلدرچین آب‌پز|Quail egg, boiled|160|13.2|0.8|11.5|
تخم بلدرچین ترشی|Pickled quail egg|146|12.5|1.5|10|
تخم اردک خام|Duck egg, raw|181|12.8|1.5|13.8|
تخم اردک آب‌پز|Duck egg, boiled|191|13.5|1.5|14.5|
تخم اردک نمک‌سود|Salted duck egg|191|13.7|3.1|13.8|
تخم غاز خام|Goose egg, raw|181|13.9|1.4|13.3|
تخم غاز آب‌پز|Goose egg, boiled|190|14.5|1.5|14|
تخم بوقلمون خام|Turkey egg, raw|167|13.7|1.2|11.9|
تخم شترمرغ خام|Ostrich egg, raw|138|12.5|0.7|9.5|
تخم شترمرغ آب‌پز|Ostrich egg, boiled|146|13|1|10|
تخم کبک خام|Partridge egg, raw|153|13|0.5|11|
تخم کبوتر آب‌پز|Pigeon egg, boiled|142|12|1|10|
تخم مرغابی خام|Wild duck egg, raw|178|12.8|1.4|13.5|
تخم‌مرغ سرخ‌شده خمیری (پوشش‌دار)|Breaded fried egg|223|11|11|15|
سالاد تخم‌مرغ با مایونز|Egg salad|191|7|2.5|17|سالاد تخم مرغ
سالاد تخم‌مرغ با ماست|Egg salad with yogurt|118|8.5|3|8|
تخم‌مرغ پر شده (دویلد اگ)|Deviled eggs|175|8.5|1.5|15|
سفیده تخم‌مرغ نیمرو شده|Fried egg white|74|11|0.8|3|
سفیده تخم‌مرغ اسکرمبل|Scrambled egg whites|69|10.5|1.2|2.5|
زرده تخم‌مرغ سرخ‌شده|Fried egg yolk|348|16|3.5|30|
زرده تخم‌مرغ نمک‌سود|Cured egg yolk|492|28|5|40|
`;
const ING_VEG = `
اسفناج آب‌پز|Spinach, boiled|30|2.9|3.6|0.4|
اسفناج بخارپز|Spinach, steamed|30|3|3.7|0.4|
اسفناج تفت‌داده با روغن|Spinach, sauteed in oil|84|3.8|4.7|5.5|
اسفناج کنسروی|Spinach, canned|27|2.6|3.2|0.4|
اسفناج خشک‌شده|Spinach, dried|207|20.3|25.2|2.8|
کاهو رومی خام|Romaine lettuce, raw|21|1.2|3.3|0.3|
کاهو رومی کبابی (گریل)|Romaine lettuce, grilled|33|1.4|3.8|1.3|
کاهو سالادی (آیسبرگ) خام|Iceberg lettuce, raw|17|0.9|3|0.1|
کاهو برگ قرمز خام|Red leaf lettuce, raw|16|1.3|2.3|0.2|
کاهو برگ سبز خام|Green leaf lettuce, raw|19|1.4|2.9|0.2|
کاهو کره‌ای (باترهد) خام|Butterhead lettuce, raw|16|1.4|2.2|0.2|
کاهو پیچ خام|Curly lettuce, raw|17|1.3|2.5|0.2|
کاهوی شاخی خام|Chicory lettuce, raw|28|1.7|4.7|0.3|
اسکاروله خام|Escarole, raw|23|1.8|3.4|0.2|
اسکاروله آب‌پز|Escarole, boiled|23|1.8|3.4|0.2|
اسکاروله تفت‌داده با روغن|Escarole, sauteed in oil|75|2.3|4.4|5.3|
سبزی روکولا خام|Arugula, raw|32|2.6|3.7|0.7|روکولا؛ارگولا
کلم پیچ سبز خام|Green cabbage, raw|29|1.3|5.8|0.1|کلم
کلم پیچ سبز آب‌پز|Green cabbage, boiled|28|1.3|5.5|0.1|کلم
کلم پیچ سبز بخارپز|Green cabbage, steamed|28|1.3|5.6|0.1|کلم
کلم پیچ سبز تفت‌داده با روغن|Green cabbage, sauteed in oil|81|1.7|7|5.1|کلم
کلم پیچ سبز کبابی (گریل)|Green cabbage, grilled|43|1.5|6.7|1.1|کلم
کلم پیچ سبز ترشی|Green cabbage, pickled|24|0.9|4.8|0.1|کلم
کلم پیچ سبز کنسروی|Green cabbage, canned|27|1.2|5.2|0.1|کلم
کلم پیچ سبز منجمد|Green cabbage, frozen|29|1.3|5.7|0.1|کلم
کلم قرمز خام|Red cabbage, raw|37|1.4|7.4|0.2|
کلم قرمز آب‌پز|Red cabbage, boiled|35|1.4|7|0.2|
کلم قرمز بخارپز|Red cabbage, steamed|36|1.4|7.2|0.2|
کلم قرمز تفت‌داده با روغن|Red cabbage, sauteed in oil|91|1.8|8.9|5.3|
کلم قرمز ترشی|Red cabbage, pickled|29|1|6.1|0.1|
کلم قرمز کنسروی|Red cabbage, canned|34|1.3|6.7|0.2|
کلم ساووی خام|Savoy cabbage, raw|33|2|6.1|0.1|
کلم ساووی آب‌پز|Savoy cabbage, boiled|32|2|5.8|0.1|
کلم ساووی بخارپز|Savoy cabbage, steamed|33|2|5.9|0.1|
کلم چینی خام|Napa cabbage, raw|21|1.5|3.2|0.2|
کلم چینی آب‌پز|Napa cabbage, boiled|20|1.5|3|0.2|
کلم چینی بخارپز|Napa cabbage, steamed|20|1.5|3.1|0.2|
کلم چینی تفت‌داده با روغن|Napa cabbage, sauteed in oil|71|2|3.8|5.3|
کلم بروکلی آب‌پز|Broccoli, boiled|40|2.8|6.3|0.4|بروکلی
کلم بروکلی تفت‌داده با روغن|Broccoli, sauteed in oil|96|3.6|7.9|5.5|بروکلی
کلم بروکلی کبابی (گریل)|Broccoli, grilled|57|3.2|7.6|1.5|بروکلی
کلم بروکلی منجمد|Broccoli, frozen|40|2.7|6.5|0.4|بروکلی
کلم بروکلی ترشی|Broccoli, pickled|32|2|5.4|0.3|بروکلی
کلم بروکلی کنسروی|Broccoli, canned|37|2.5|5.9|0.4|بروکلی
گل‌کلم خام|Cauliflower, raw|30|1.9|5|0.3|گل کلم
گل‌کلم آب‌پز|Cauliflower, boiled|29|1.9|4.8|0.3|گل کلم
گل‌کلم بخارپز|Cauliflower, steamed|29|1.9|4.8|0.3|گل کلم
گل‌کلم تفت‌داده با روغن|Cauliflower, sauteed in oil|83|2.5|6|5.4|گل کلم
گل‌کلم کبابی (گریل)|Cauliflower, grilled|44|2.2|5.8|1.3|گل کلم
گل‌کلم منجمد|Cauliflower, frozen|30|1.9|4.9|0.3|گل کلم
گل‌کلم ترشی|Cauliflower, pickled|24|1.3|4.3|0.2|گل کلم
گل‌کلم کنسروی|Cauliflower, canned|28|1.7|4.5|0.3|گل کلم
گل‌کلم بنفش خام|Purple cauliflower, raw|31|2|5|0.3|
گل‌کلم بنفش آب‌پز|Purple cauliflower, boiled|30|2|4.8|0.3|
گل‌کلم بنفش بخارپز|Purple cauliflower, steamed|30|2|4.8|0.3|
کلم بروکسل خام|Brussels sprouts, raw|52|3.4|9|0.3|
کلم بروکسل آب‌پز|Brussels sprouts, boiled|50|3.4|8.5|0.3|
کلم بروکسل بخارپز|Brussels sprouts, steamed|52|3.5|8.7|0.3|
کلم بروکسل تفت‌داده با روغن|Brussels sprouts, sauteed in oil|109|4.4|10.8|5.4|
کلم بروکسل کبابی (گریل)|Brussels sprouts, grilled|69|3.9|10.3|1.3|
کلم بروکسل منجمد|Brussels sprouts, frozen|51|3.3|8.8|0.3|
کلم کیل (کلم برگ) خام|Kale, raw|61|4.3|8.8|0.9|کیل
کلم کیل (کلم برگ) آب‌پز|Kale, boiled|61|4.3|8.8|0.9|کیل
کلم کیل (کلم برگ) بخارپز|Kale, steamed|62|4.4|9|0.9|کیل
کلم کیل (کلم برگ) تفت‌داده با روغن|Kale, sauteed in oil|124|5.6|11.4|6.2|کیل
کلم کیل (کلم برگ) منجمد|Kale, frozen|59|4.2|8.6|0.9|کیل
کلم قمری (کلم‌رابی) خام|Kohlrabi, raw|33|1.7|6.2|0.1|کلم قمری
کلم قمری (کلم‌رابی) آب‌پز|Kohlrabi, boiled|31|1.7|5.9|0.1|کلم قمری
کلم قمری (کلم‌رابی) بخارپز|Kohlrabi, steamed|32|1.7|6|0.1|کلم قمری
گل‌کلم رومانسکو خام|Romanesco, raw|33|2.5|5|0.3|
گل‌کلم رومانسکو آب‌پز|Romanesco, boiled|32|2.5|4.8|0.3|
گل‌کلم رومانسکو بخارپز|Romanesco, steamed|32|2.5|4.8|0.3|
شلغم خام|Turnip, raw|30|0.9|6.4|0.1|
شلغم آب‌پز|Turnip, boiled|30|0.9|6.4|0.1|
شلغم بخارپز|Turnip, steamed|31|0.9|6.5|0.1|
شلغم تفت‌داده با روغن|Turnip, sauteed in oil|91|1.2|7.7|6.1|
شلغم کبابی (گریل)|Turnip, grilled|44|1|7.4|1.1|
شلغم ترشی|Turnip, pickled|24|0.6|5.3|0.1|
شلغم برگ خام|Turnip greens, raw|37|1.5|7.1|0.3|
شلغم برگ آب‌پز|Turnip greens, boiled|37|1.5|7.1|0.3|
شلغم برگ تفت‌داده با روغن|Turnip greens, sauteed in oil|93|2|9.2|5.4|
شلغم برگ منجمد|Turnip greens, frozen|37|1.5|7|0.3|
تربچه قرمز آب‌پز|Radish, boiled|17|0.7|3.4|0.1|تربچه
تربچه قرمز کبابی (گریل)|Radish, grilled|29|0.8|3.9|1.1|تربچه
تربچه قرمز ترشی|Radish, pickled|15|0.5|3|0.1|تربچه
تربچه سفید (دایکن)|Daikon radish|20|0.6|4.1|0.1|
تربچه سفید (دایکن) آب‌پز|Daikon radish, boiled|20|0.6|4.1|0.1|
تربچه سفید (دایکن) بخارپز|Daikon radish, steamed|20|0.6|4.2|0.1|
تربچه سفید (دایکن) تفت‌داده با روغن|Daikon radish, sauteed in oil|78|0.8|4.9|6.1|
تربچه سفید (دایکن) ترشی|Daikon radish, pickled|17|0.4|3.6|0.1|
تربچه سیاه|Black radish|33|1.2|6.7|0.1|
تربچه سیاه آب‌پز|Black radish, boiled|33|1.2|6.7|0.1|
هویج آب‌پز|Carrot, boiled|44|0.9|9.6|0.2|
هویج تفت‌داده با روغن|Carrot, sauteed in oil|108|1.2|11.5|6.3|
هویج کبابی (گریل)|Carrot, grilled|59|1|11|1.2|
هویج ترشی|Carrot, pickled|34|0.6|7.7|0.1|
هویج کنسروی|Carrot, canned|39|0.8|8.6|0.2|
هویج منجمد|Carrot, frozen|43|0.9|9.4|0.2|
هویج بنفش خام|Purple carrot, raw|44|0.9|9.6|0.2|
هویج بنفش آب‌پز|Purple carrot, boiled|44|0.9|9.6|0.2|
هویج بنفش بخارپز|Purple carrot, steamed|45|0.9|9.8|0.2|
هویج بیبی خام|Baby carrot, raw|36|0.6|8.2|0.1|
هویج بیبی آب‌پز|Baby carrot, boiled|36|0.6|8.2|0.1|
هویج بیبی بخارپز|Baby carrot, steamed|37|0.6|8.4|0.1|
چغندر قرمز خام|Red beet, raw|47|1.6|9.6|0.2|چغندر
چغندر قرمز آب‌پز|Red beet, boiled|47|1.6|9.6|0.2|چغندر
چغندر قرمز بخارپز|Red beet, steamed|47|1.6|9.8|0.2|چغندر
چغندر قرمز کبابی (گریل)|Red beet, grilled|62|1.8|11|1.2|چغندر
چغندر قرمز ترشی|Red beet, pickled|36|1.1|7.7|0.1|چغندر
چغندر قرمز کنسروی|Red beet, canned|42|1.4|8.6|0.2|چغندر
چغندر زرد خام|Golden beet, raw|47|1.6|9.6|0.2|
چغندر زرد آب‌پز|Golden beet, boiled|47|1.6|9.6|0.2|
چغندر زرد بخارپز|Golden beet, steamed|47|1.6|9.8|0.2|
چغندر برگ (سوئیس چارد) خام|Swiss chard, raw|24|1.8|3.7|0.2|
چغندر برگ (سوئیس چارد) آب‌پز|Swiss chard, boiled|24|1.8|3.7|0.2|
چغندر برگ (سوئیس چارد) بخارپز|Swiss chard, steamed|24|1.8|3.8|0.2|
چغندر برگ (سوئیس چارد) تفت‌داده با روغن|Swiss chard, sauteed in oil|76|2.3|4.8|5.3|
چغندر قند خام خام|Sugar beet, raw|77|1.6|17.5|0.1|
کرفس ساقه خام|Celery stalk, raw|17|0.7|3|0.2|کرفس
کرفس ساقه آب‌پز|Celery stalk, boiled|17|0.7|3|0.2|کرفس
کرفس ساقه بخارپز|Celery stalk, steamed|17|0.7|3.1|0.2|کرفس
کرفس ساقه تفت‌داده با روغن|Celery stalk, sauteed in oil|75|0.9|3.6|6.3|کرفس
کرفس ساقه ترشی|Celery stalk, pickled|14|0.5|2.8|0.1|کرفس
کرفس ریشه‌ای خام|Celeriac, raw|46|1.5|9.2|0.3|
کرفس ریشه‌ای آب‌پز|Celeriac, boiled|46|1.5|9.2|0.3|
کرفس ریشه‌ای بخارپز|Celeriac, steamed|46|1.5|9.4|0.3|
کرفس ریشه‌ای تفت‌داده با روغن|Celeriac, sauteed in oil|110|2|11|6.4|
جعفری ریشه‌ای خام|Parsley root, raw|89|3|18|0.6|
جعفری ریشه‌ای آب‌پز|Parsley root, boiled|89|3|18|0.6|
جعفری ریشه‌ای بخارپز|Parsley root, steamed|91|3.1|18.4|0.6|
پارسنیپ خام|Parsnip, raw|80|1.2|18|0.3|پارسنیپ
پارسنیپ آب‌پز|Parsnip, boiled|80|1.2|18|0.3|پارسنیپ
پارسنیپ بخارپز|Parsnip, steamed|81|1.2|18.4|0.3|پارسنیپ
پارسنیپ تفت‌داده با روغن|Parsnip, sauteed in oil|150|1.6|21.6|6.4|پارسنیپ
پارسنیپ کبابی (گریل)|Parsnip, grilled|100|1.4|20.7|1.3|پارسنیپ
سیب‌زمینی با پوست خام|Potato with skin, raw|79|2.1|17.5|0.1|سیب زمینی
سیب‌زمینی با پوست آب‌پز|Potato with skin, boiled|84|2.3|18.4|0.1|سیب زمینی
سیب‌زمینی با پوست بخارپز|Potato with skin, steamed|85|2.4|18.7|0.1|سیب زمینی
سیب‌زمینی با پوست تفت‌داده با روغن|Potato with skin, sauteed in oil|185|2.9|22.8|9.1|سیب زمینی
سیب‌زمینی با پوست کبابی (گریل)|Potato with skin, grilled|100|2.4|20.1|1.1|سیب زمینی
سیب‌زمینی بدون پوست خام|Potato, peeled, raw|78|1.8|17.5|0.1|
سیب‌زمینی بدون پوست آب‌پز|Potato, peeled, boiled|83|2|18.4|0.1|
سیب‌زمینی بدون پوست بخارپز|Potato, peeled, steamed|84|2|18.7|0.1|
سیب‌زمینی بدون پوست تفت‌داده با روغن|Potato, peeled, sauteed in oil|183|2.5|22.8|9.1|
سیب‌زمینی قرمز خام|Red potato, raw|72|1.9|15.9|0.1|
سیب‌زمینی قرمز آب‌پز|Red potato, boiled|76|2.1|16.7|0.1|
سیب‌زمینی قرمز بخارپز|Red potato, steamed|77|2.1|17|0.1|
سیب‌زمینی قرمز تفت‌داده با روغن|Red potato, sauteed in oil|176|2.7|20.7|9.1|
سیب‌زمینی قرمز کبابی (گریل)|Red potato, grilled|92|2.2|18.3|1.1|
سیب‌زمینی زرد خام|Yellow potato, raw|77|2|17|0.1|
سیب‌زمینی زرد آب‌پز|Yellow potato, boiled|81|2.2|17.9|0.1|
سیب‌زمینی زرد بخارپز|Yellow potato, steamed|83|2.2|18.2|0.1|
سیب‌زمینی زرد تفت‌داده با روغن|Yellow potato, sauteed in oil|182|2.8|22.1|9.1|
سیب‌زمینی زرد کبابی (گریل)|Yellow potato, grilled|97|2.3|19.5|1.1|
سیب‌زمینی بنفش خام|Purple potato, raw|77|2|17|0.1|
سیب‌زمینی بنفش آب‌پز|Purple potato, boiled|81|2.2|17.9|0.1|
سیب‌زمینی بنفش بخارپز|Purple potato, steamed|83|2.2|18.2|0.1|
سیب‌زمینی بنفش تفت‌داده با روغن|Purple potato, sauteed in oil|182|2.8|22.1|9.1|
سیب‌زمینی بنفش کبابی (گریل)|Purple potato, grilled|97|2.3|19.5|1.1|
سیب‌زمینی جدید (ریز) خام|New potato, raw|67|1.6|15|0.1|
سیب‌زمینی جدید (ریز) آب‌پز|New potato, boiled|71|1.8|15.8|0.1|
سیب‌زمینی جدید (ریز) بخارپز|New potato, steamed|73|1.8|16.1|0.1|
سیب‌زمینی جدید (ریز) تفت‌داده با روغن|New potato, sauteed in oil|169|2.2|19.5|9.1|
سیب‌زمینی جدید (ریز) کبابی (گریل)|New potato, grilled|86|1.8|17.3|1.1|
سیب‌زمینی شیرین (بتاتا) خام|Sweet potato, raw|88|1.6|20.1|0.1|سیب زمینی شیرین
سیب‌زمینی شیرین (بتاتا) آب‌پز|Sweet potato, boiled|93|1.8|21.1|0.1|سیب زمینی شیرین
سیب‌زمینی شیرین (بتاتا) بخارپز|Sweet potato, steamed|94|1.8|21.5|0.1|سیب زمینی شیرین
سیب‌زمینی شیرین (بتاتا) تفت‌داده با روغن|Sweet potato, sauteed in oil|195|2.2|26.1|9.1|سیب زمینی شیرین
سیب‌زمینی شیرین (بتاتا) کبابی (گریل)|Sweet potato, grilled|110|1.8|23.1|1.1|سیب زمینی شیرین
سیب‌زمینی شیرین بنفش خام|Purple sweet potato, raw|87|1.5|20|0.1|
سیب‌زمینی شیرین بنفش آب‌پز|Purple sweet potato, boiled|92|1.7|21|0.1|
سیب‌زمینی شیرین بنفش بخارپز|Purple sweet potato, steamed|93|1.7|21.4|0.1|
سیب‌زمینی شیرین بنفش کبابی (گریل)|Purple sweet potato, grilled|109|1.7|23|1.1|
ذرت شیرین (بلال) خام|Sweet corn (cob), raw|102|3.3|19|1.4|بلال
ذرت شیرین (بلال) آب‌پز|Sweet corn (cob), boiled|107|3.6|19.9|1.4|بلال
ذرت شیرین (بلال) بخارپز|Sweet corn (cob), steamed|109|3.7|20.3|1.4|بلال
ذرت شیرین (بلال) کبابی (گریل)|Sweet corn (cob), grilled|126|3.8|21.8|2.6|بلال
ذرت شیرین (بلال) کنسروی|Sweet corn (cob), canned|93|3|17.1|1.4|بلال
ذرت شیرین (بلال) منجمد|Sweet corn (cob), frozen|100|3.2|18.6|1.4|بلال
جیکاما (شلغم مکزیکی) خام|Jicama, raw|39|0.7|8.8|0.1|
زنجبیل تازه خام|Fresh ginger, raw|86|1.8|17.8|0.8|
زنجبیل تازه ترشی|Fresh ginger, pickled|66|1.3|13.9|0.6|
زردچوبه تازه خام|Fresh turmeric root, raw|105|1.9|22|1|
سیر آب‌پز|Garlic, boiled|162|6.4|33|0.5|
سیر تفت‌داده با روغن|Garlic, sauteed in oil|242|7.7|37.9|6.6|
سیر کبابی (گریل)|Garlic, grilled|196|7.4|37.9|1.6|
پیاز سفید خام|White onion, raw|42|0.9|9.3|0.1|پیاز
پیاز سفید آب‌پز|White onion, boiled|42|0.9|9.3|0.1|پیاز
پیاز سفید بخارپز|White onion, steamed|43|0.9|9.5|0.1|پیاز
پیاز سفید تفت‌داده با روغن|White onion, sauteed in oil|102|1.1|10.7|6.1|پیاز
پیاز سفید کبابی (گریل)|White onion, grilled|57|1|10.7|1.1|پیاز
پیاز سفید ترشی|White onion, pickled|33|0.6|7.5|0.1|پیاز
پیاز زرد خام|Yellow onion, raw|43|1.1|9.3|0.1|
پیاز زرد آب‌پز|Yellow onion, boiled|43|1.1|9.3|0.1|
پیاز زرد بخارپز|Yellow onion, steamed|43|1.1|9.5|0.1|
پیاز زرد تفت‌داده با روغن|Yellow onion, sauteed in oil|103|1.3|10.7|6.1|
پیاز زرد کبابی (گریل)|Yellow onion, grilled|58|1.3|10.7|1.1|
پیاز زرد ترشی|Yellow onion, pickled|34|0.8|7.5|0.1|
پیاز قرمز خام|Red onion, raw|45|1|9.9|0.1|
پیاز قرمز آب‌پز|Red onion, boiled|45|1|9.9|0.1|
پیاز قرمز تفت‌داده با روغن|Red onion, sauteed in oil|105|1.2|11.4|6.1|
پیاز قرمز کبابی (گریل)|Red onion, grilled|60|1.1|11.4|1.1|
پیاز قرمز ترشی|Red onion, pickled|35|0.7|7.9|0.1|
پیاز شالوت خام|Shallot, raw|78|2.5|16.8|0.1|
پیاز شالوت آب‌پز|Shallot, boiled|78|2.5|16.8|0.1|
پیاز شالوت تفت‌داده با روغن|Shallot, sauteed in oil|144|3|19.3|6.1|
پیازچه خام|Spring onion, raw|38|1.8|7.3|0.2|پیاز سبز
پیازچه آب‌پز|Spring onion, boiled|38|1.8|7.3|0.2|پیاز سبز
پیازچه تفت‌داده با روغن|Spring onion, sauteed in oil|98|2.2|8.4|6.2|پیاز سبز
پیازچه کبابی (گریل)|Spring onion, grilled|53|2.1|8.4|1.2|پیاز سبز
تره خام|Leek, raw|66|1.5|14.2|0.3|
تره آب‌پز|Leek, boiled|66|1.5|14.2|0.3|
تره بخارپز|Leek, steamed|67|1.5|14.5|0.3|
تره تفت‌داده با روغن|Leek, sauteed in oil|130|1.8|16.3|6.4|
تره کبابی (گریل)|Leek, grilled|84|1.7|16.3|1.3|
سیر تازه (سیرچه) خام|Green garlic, raw|60|2.5|12|0.2|
سیر تازه (سیرچه) آب‌پز|Green garlic, boiled|60|2.5|12|0.2|
سیر تازه (سیرچه) تفت‌داده با روغن|Green garlic, sauteed in oil|123|3|13.8|6.2|
گوجه‌فرنگی خام|Tomato, raw|21|0.9|3.9|0.2|گوجه فرنگی
گوجه‌فرنگی آب‌پز|Tomato, boiled|19|0.9|3.5|0.2|گوجه فرنگی
گوجه‌فرنگی تفت‌داده با روغن|Tomato, sauteed in oil|80|1.2|4.7|6.3|گوجه فرنگی
گوجه‌فرنگی کبابی (گریل)|Tomato, grilled|33|1|4.5|1.2|گوجه فرنگی
گوجه‌فرنگی ترشی|Tomato, pickled|17|0.6|3.4|0.1|گوجه فرنگی
گوجه‌فرنگی کنسروی|Tomato, canned|19|0.8|3.5|0.2|گوجه فرنگی
گوجه‌فرنگی خشک‌شده|Tomato, dried|147|6.3|27.3|1.4|گوجه فرنگی
گوجه‌فرنگی منجمد|Tomato, frozen|21|0.9|3.8|0.2|گوجه فرنگی
گوجه‌فرنگی گیلاسی خام|Cherry tomato, raw|21|0.9|3.9|0.2|
گوجه‌فرنگی گیلاسی آب‌پز|Cherry tomato, boiled|19|0.9|3.5|0.2|
گوجه‌فرنگی گیلاسی تفت‌داده با روغن|Cherry tomato, sauteed in oil|80|1.2|4.7|6.3|
گوجه‌فرنگی گیلاسی کبابی (گریل)|Cherry tomato, grilled|33|1|4.5|1.2|
گوجه‌فرنگی سبز خام|Green tomato, raw|27|1.2|5.1|0.2|
گوجه‌فرنگی سبز تفت‌داده با روغن|Green tomato, sauteed in oil|88|1.6|6.1|6.3|
گوجه‌فرنگی سبز ترشی|Green tomato, pickled|21|0.8|4.3|0.1|
گوجه‌فرنگی زرد خام|Yellow tomato, raw|21|0.9|3.9|0.2|
گوجه‌فرنگی گلخانه‌ای خام|Greenhouse tomato, raw|19|0.9|3.5|0.2|
گوجه‌فرنگی گلخانه‌ای آب‌پز|Greenhouse tomato, boiled|18|0.9|3.1|0.2|
گوجه‌فرنگی گلخانه‌ای تفت‌داده با روغن|Greenhouse tomato, sauteed in oil|78|1.2|4.2|6.3|
گوجه‌فرنگی گلخانه‌ای کبابی (گریل)|Greenhouse tomato, grilled|31|1|4|1.2|
گوجه‌فرنگی خردشده کنسروی|Canned diced tomato|20|0.8|3.7|0.2|
خیار خام|Cucumber, raw|18|0.7|3.6|0.1|
خیار کبابی (گریل)|Cucumber, grilled|30|0.8|4.1|1.1|
خیار ترشی|Cucumber, pickled|16|0.5|3.2|0.1|
خیار گلخانه‌ای خام|Greenhouse cucumber, raw|16|0.7|3|0.1|
خیار چنبر خام|Armenian cucumber, raw|15|0.6|2.8|0.1|
خیار بدون پوست خام|Peeled cucumber, raw|16|0.6|3.1|0.1|
کدو سبز خام|Zucchini, raw|20|1.2|3.1|0.3|کدو
کدو سبز آب‌پز|Zucchini, boiled|19|1.2|2.8|0.3|کدو
کدو سبز بخارپز|Zucchini, steamed|19|1.2|2.8|0.3|کدو
کدو سبز تفت‌داده با روغن|Zucchini, sauteed in oil|79|1.6|3.7|6.4|کدو
کدو سبز کبابی (گریل)|Zucchini, grilled|32|1.4|3.6|1.3|کدو
کدو زرد خام|Yellow squash, raw|20|1.2|3.4|0.2|
کدو زرد آب‌پز|Yellow squash, boiled|19|1.2|3.1|0.2|
کدو زرد بخارپز|Yellow squash, steamed|19|1.2|3.1|0.2|
کدو زرد تفت‌داده با روغن|Yellow squash, sauteed in oil|80|1.6|4.1|6.3|
کدو زرد کبابی (گریل)|Yellow squash, grilled|32|1.4|3.9|1.2|
کدو حلوایی آب‌پز|Pumpkin, boiled|33|1.1|6.8|0.1|کدو تنبل
کدو حلوایی بخارپز|Pumpkin, steamed|33|1.1|7|0.1|کدو تنبل
کدو حلوایی تفت‌داده با روغن|Pumpkin, sauteed in oil|122|1.4|8.5|9.1|کدو تنبل
کدو حلوایی کبابی (گریل)|Pumpkin, grilled|44|1.1|7.5|1.1|کدو تنبل
کدو مسمایی خام|Butternut squash, raw|52|1|11.7|0.1|
کدو مسمایی آب‌پز|Butternut squash, boiled|55|1.1|12.3|0.1|
کدو مسمایی بخارپز|Butternut squash, steamed|55|1.1|12.5|0.1|
کدو مسمایی کبابی (گریل)|Butternut squash, grilled|68|1.1|13.5|1.1|
کدو اسپاگتی خام|Spaghetti squash, raw|35|0.6|6.9|0.6|
کدو اسپاگتی آب‌پز|Spaghetti squash, boiled|37|0.7|7.2|0.6|
کدو اسپاگتی بخارپز|Spaghetti squash, steamed|38|0.7|7.4|0.6|
کدو آجیلی خام|Acorn squash, raw|46|0.8|10.4|0.1|
کدو آجیلی آب‌پز|Acorn squash, boiled|48|0.9|10.9|0.1|
کدو آجیلی بخارپز|Acorn squash, steamed|49|0.9|11.1|0.1|
کدو خورشتی خام|Cooking marrow, raw|19|0.9|3.5|0.1|
کدو خورشتی آب‌پز|Cooking marrow, boiled|17|0.9|3.1|0.1|
کدو خورشتی تفت‌داده با روغن|Cooking marrow, sauteed in oil|77|1.2|4.2|6.1|
بادمجان آب‌پز|Eggplant, boiled|27|1|5.3|0.2|
بادمجان تفت‌داده با روغن|Eggplant, sauteed in oil|90|1.3|7.1|6.3|
بادمجان کبابی (گریل)|Eggplant, grilled|42|1.1|6.8|1.2|
بادمجان ترشی|Eggplant, pickled|23|0.7|4.9|0.1|
بادمجان کنسروی|Eggplant, canned|27|0.9|5.3|0.2|
بادمجان سیاه خام|Black eggplant, raw|29|1|5.9|0.2|
بادمجان سیاه آب‌پز|Black eggplant, boiled|27|1|5.3|0.2|
بادمجان سیاه تفت‌داده با روغن|Black eggplant, sauteed in oil|90|1.3|7.1|6.3|
بادمجان سیاه کبابی (گریل)|Black eggplant, grilled|42|1.1|6.8|1.2|
بادمجان سفید خام|White eggplant, raw|28|1|5.5|0.2|
بادمجان سفید آب‌پز|White eggplant, boiled|26|1|5|0.2|
بادمجان سفید تفت‌داده با روغن|White eggplant, sauteed in oil|88|1.3|6.6|6.3|
بادمجان سفید کبابی (گریل)|White eggplant, grilled|40|1.1|6.3|1.2|
بادمجان بنفش کوچک خام|Small purple eggplant, raw|29|1|5.8|0.2|
بادمجان بنفش کوچک آب‌پز|Small purple eggplant, boiled|27|1|5.2|0.2|
بادمجان بنفش کوچک تفت‌داده با روغن|Small purple eggplant, sauteed in oil|90|1.3|7|6.3|
بادمجان بنفش کوچک کبابی (گریل)|Small purple eggplant, grilled|42|1.1|6.7|1.2|
فلفل دلمه‌ای سبز خام|Green bell pepper, raw|24|0.9|4.6|0.2|فلفل دلمه
فلفل دلمه‌ای سبز آب‌پز|Green bell pepper, boiled|22|0.9|4.1|0.2|فلفل دلمه
فلفل دلمه‌ای سبز بخارپز|Green bell pepper, steamed|22|0.9|4.2|0.2|فلفل دلمه
فلفل دلمه‌ای سبز تفت‌داده با روغن|Green bell pepper, sauteed in oil|84|1.2|5.5|6.3|فلفل دلمه
فلفل دلمه‌ای سبز کبابی (گریل)|Green bell pepper, grilled|36|1|5.3|1.2|فلفل دلمه
فلفل دلمه‌ای سبز ترشی|Green bell pepper, pickled|19|0.6|3.9|0.1|فلفل دلمه
فلفل دلمه‌ای سبز منجمد|Green bell pepper, frozen|23|0.9|4.5|0.2|فلفل دلمه
فلفل دلمه‌ای قرمز خام|Red bell pepper, raw|31|1|6|0.3|
فلفل دلمه‌ای قرمز آب‌پز|Red bell pepper, boiled|28|1|5.4|0.3|
فلفل دلمه‌ای قرمز بخارپز|Red bell pepper, steamed|29|1|5.5|0.3|
فلفل دلمه‌ای قرمز تفت‌داده با روغن|Red bell pepper, sauteed in oil|92|1.3|7.2|6.4|
فلفل دلمه‌ای قرمز کبابی (گریل)|Red bell pepper, grilled|44|1.1|6.9|1.3|
فلفل دلمه‌ای قرمز ترشی|Red bell pepper, pickled|25|0.7|5|0.2|
فلفل دلمه‌ای قرمز منجمد|Red bell pepper, frozen|30|1|5.9|0.3|
فلفل دلمه‌ای زرد خام|Yellow bell pepper, raw|31|1|6.3|0.2|
فلفل دلمه‌ای زرد آب‌پز|Yellow bell pepper, boiled|29|1|5.7|0.2|
فلفل دلمه‌ای زرد تفت‌داده با روغن|Yellow bell pepper, sauteed in oil|92|1.3|7.6|6.3|
فلفل دلمه‌ای زرد کبابی (گریل)|Yellow bell pepper, grilled|44|1.1|7.2|1.2|
فلفل دلمه‌ای زرد منجمد|Yellow bell pepper, frozen|31|1|6.2|0.2|
فلفل دلمه‌ای نارنجی خام|Orange bell pepper, raw|31|1|6.3|0.2|
فلفل دلمه‌ای نارنجی تفت‌داده با روغن|Orange bell pepper, sauteed in oil|92|1.3|7.6|6.3|
فلفل دلمه‌ای نارنجی کبابی (گریل)|Orange bell pepper, grilled|44|1.1|7.2|1.2|
فلفل تند سبز خام|Green chili pepper, raw|48|2|9.5|0.2|فلفل سبز تند
فلفل تند سبز تفت‌داده با روغن|Green chili pepper, sauteed in oil|113|2.6|11.4|6.3|فلفل سبز تند
فلفل تند سبز کبابی (گریل)|Green chili pepper, grilled|64|2.3|10.9|1.2|فلفل سبز تند
فلفل تند سبز ترشی|Green chili pepper, pickled|37|1.4|7.6|0.1|فلفل سبز تند
فلفل تند سبز خشک‌شده|Green chili pepper, dried|335|14|66.5|1.4|فلفل سبز تند
فلفل تند قرمز خام|Red chili pepper, raw|46|1.9|8.8|0.4|
فلفل تند قرمز تفت‌داده با روغن|Red chili pepper, sauteed in oil|111|2.5|10.6|6.5|
فلفل تند قرمز کبابی (گریل)|Red chili pepper, grilled|63|2.2|10.1|1.5|
فلفل تند قرمز ترشی|Red chili pepper, pickled|36|1.3|7.1|0.3|
فلفل تند قرمز خشک‌شده|Red chili pepper, dried|325|13.3|61.6|2.8|
فلفل هالوپینو خام|Jalapeno pepper, raw|33|0.9|6.5|0.4|هالوپینو
فلفل هالوپینو تفت‌داده با روغن|Jalapeno pepper, sauteed in oil|95|1.2|7.8|6.5|هالوپینو
فلفل هالوپینو کبابی (گریل)|Jalapeno pepper, grilled|48|1|7.5|1.5|هالوپینو
فلفل هالوپینو ترشی|Jalapeno pepper, pickled|27|0.6|5.4|0.3|هالوپینو
فلفل هالوپینو کنسروی|Jalapeno pepper, canned|30|0.8|5.9|0.4|هالوپینو
فلفل موزی (بنانا پپر) خام|Banana pepper, raw|33|1.7|5.3|0.5|
فلفل موزی (بنانا پپر) تفت‌داده با روغن|Banana pepper, sauteed in oil|95|2.2|6.4|6.7|
فلفل موزی (بنانا پپر) ترشی|Banana pepper, pickled|26|1.2|4.5|0.3|
فلفل موزی (بنانا پپر) کنسروی|Banana pepper, canned|30|1.5|4.8|0.5|
فلفل سبز شیرین (فلفل سبز) خام|Sweet green pepper, raw|24|1|4.5|0.2|
فلفل سبز شیرین (فلفل سبز) تفت‌داده با روغن|Sweet green pepper, sauteed in oil|84|1.3|5.4|6.3|
فلفل سبز شیرین (فلفل سبز) کبابی (گریل)|Sweet green pepper, grilled|36|1.1|5.2|1.2|
فلفل قرمز کنسروی (رب فلفل)|Roasted red peppers, jarred|27|0.9|4.9|0.4|
لوبیا سبز تازه خام|Green beans, raw|37|1.8|7|0.2|لوبیا سبز
لوبیا سبز تازه آب‌پز|Green beans, boiled|39|1.8|7.4|0.2|لوبیا سبز
لوبیا سبز تازه بخارپز|Green beans, steamed|39|1.8|7.5|0.2|لوبیا سبز
لوبیا سبز تازه تفت‌داده با روغن|Green beans, sauteed in oil|89|2.2|8.4|5.2|لوبیا سبز
لوبیا سبز تازه منجمد|Green beans, frozen|37|1.8|6.9|0.2|لوبیا سبز
لوبیا سبز تازه کنسروی|Green beans, canned|33|1.6|6.3|0.2|لوبیا سبز
لوبیای سبز بلند (چینی) خام|Yardlong bean, raw|48|2.8|8.4|0.4|
لوبیای سبز بلند (چینی) آب‌پز|Yardlong bean, boiled|50|2.8|8.8|0.4|
لوبیای سبز بلند (چینی) بخارپز|Yardlong bean, steamed|51|2.9|9|0.4|
لوبیای سبز بلند (چینی) تفت‌داده با روغن|Yardlong bean, sauteed in oil|104|3.4|10.1|5.5|
لوبیا چشم‌بلبلی تازه خام|Fresh black-eyed peas, raw|72|3|14|0.4|
لوبیا چشم‌بلبلی تازه آب‌پز|Fresh black-eyed peas, boiled|74|3|14.7|0.4|
لوبیا چشم‌بلبلی تازه بخارپز|Fresh black-eyed peas, steamed|76|3.1|15|0.4|
نخود فرنگی تازه خام|Green peas, raw|83|5.4|14.5|0.4|نخود فرنگی
نخود فرنگی تازه آب‌پز|Green peas, boiled|86|5.4|15.2|0.4|نخود فرنگی
نخود فرنگی تازه بخارپز|Green peas, steamed|88|5.5|15.5|0.4|نخود فرنگی
نخود فرنگی تازه تفت‌داده با روغن|Green peas, sauteed in oil|145|6.5|17.4|5.5|نخود فرنگی
نخود فرنگی تازه منجمد|Green peas, frozen|82|5.3|14.2|0.4|نخود فرنگی
نخود فرنگی تازه کنسروی|Green peas, canned|76|4.9|13.1|0.4|نخود فرنگی
نخود فرنگی غلافی (اسنپ) خام|Snap peas, raw|43|2.8|7.6|0.2|
نخود فرنگی غلافی (اسنپ) آب‌پز|Snap peas, boiled|45|2.8|8|0.2|
نخود فرنگی غلافی (اسنپ) بخارپز|Snap peas, steamed|46|2.9|8.1|0.2|
نخود فرنگی غلافی (اسنپ) تفت‌داده با روغن|Snap peas, sauteed in oil|97|3.4|9.1|5.2|
نخود سبز تازه خام|Fresh chickpeas, raw|131|7|20|2.5|
نخود سبز تازه آب‌پز|Fresh chickpeas, boiled|135|7|21|2.5|
باقالی تازه خام|Fresh fava beans, raw|108|7.9|17.6|0.7|باقلا
باقالی تازه آب‌پز|Fresh fava beans, boiled|112|7.9|18.5|0.7|باقلا
باقالی تازه بخارپز|Fresh fava beans, steamed|114|8.1|18.8|0.7|باقلا
باقالی تازه تفت‌داده با روغن|Fresh fava beans, sauteed in oil|175|9.5|21.1|5.8|باقلا
باقالی سبز غلاف‌دار خام|Fava beans in pod, raw|72|4.8|12|0.5|
باقالی سبز غلاف‌دار آب‌پز|Fava beans in pod, boiled|74|4.8|12.6|0.5|
بامیه خام|Okra, raw|39|1.9|7.5|0.2|
بامیه آب‌پز|Okra, boiled|41|1.9|7.9|0.2|
بامیه بخارپز|Okra, steamed|41|1.9|8|0.2|
بامیه تفت‌داده با روغن|Okra, sauteed in oil|92|2.3|9|5.2|
بامیه کبابی (گریل)|Okra, grilled|54|2.2|8.6|1.2|
بامیه ترشی|Okra, pickled|30|1.3|6.1|0.1|
بامیه منجمد|Okra, frozen|39|1.9|7.3|0.2|
کنگر فرنگی خام|Globe artichoke, raw|57|3.3|10.5|0.2|
کنگر فرنگی آب‌پز|Globe artichoke, boiled|57|3.3|10.5|0.2|
کنگر فرنگی بخارپز|Globe artichoke, steamed|58|3.4|10.7|0.2|
کنگر فرنگی کبابی (گریل)|Globe artichoke, grilled|74|3.8|12.1|1.2|
کنگر فرنگی کنسروی|Globe artichoke, canned|52|3|9.5|0.2|
قلب کنگر آب‌پز|Artichoke hearts, boiled|46|2.9|8|0.3|
قلب کنگر کنسروی|Artichoke hearts, canned|42|2.6|7.2|0.3|
قلب کنگر کبابی (گریل)|Artichoke hearts, grilled|62|3.3|9.2|1.3|
کنگر خوراکی خام|Cardoon, raw|24|0.7|5|0.1|
کنگر خوراکی آب‌پز|Cardoon, boiled|24|0.7|5|0.1|
مارچوبه سبز خام|Green asparagus, raw|25|2.2|3.9|0.1|مارچوبه
مارچوبه سبز آب‌پز|Green asparagus, boiled|25|2.2|3.9|0.1|مارچوبه
مارچوبه سبز بخارپز|Green asparagus, steamed|26|2.2|4|0.1|مارچوبه
مارچوبه سبز تفت‌داده با روغن|Green asparagus, sauteed in oil|85|2.9|4.7|6.1|مارچوبه
مارچوبه سبز کبابی (گریل)|Green asparagus, grilled|38|2.5|4.5|1.1|مارچوبه
مارچوبه سبز کنسروی|Green asparagus, canned|23|2|3.5|0.1|مارچوبه
مارچوبه سفید خام|White asparagus, raw|23|2|3.5|0.1|
مارچوبه سفید آب‌پز|White asparagus, boiled|23|2|3.5|0.1|
مارچوبه سفید بخارپز|White asparagus, steamed|23|2|3.6|0.1|
مارچوبه سفید کنسروی|White asparagus, canned|21|1.8|3.1|0.1|
شوید تازه خام|Fresh dill, raw|52|3.5|7|1.1|
شوید تازه خشک‌شده|Fresh dill, dried|363|24.5|49|7.7|
شوید تازه تفت‌داده با روغن|Fresh dill, sauteed in oil|112|4.5|9.1|6.4|
جعفری تازه خام|Fresh parsley, raw|44|3|6.3|0.8|
جعفری تازه خشک‌شده|Fresh parsley, dried|311|21|44.1|5.6|
گشنیز تازه خام|Fresh coriander, raw|28|2.1|3.7|0.5|گشنیز
گشنیز تازه خشک‌شده|Fresh coriander, dried|194|14.7|25.9|3.5|گشنیز
نعنا تازه خام|Fresh mint, raw|53|3.3|8.4|0.7|
نعنا تازه خشک‌شده|Fresh mint, dried|372|23.1|58.8|4.9|
ریحان تازه خام|Fresh basil, raw|29|3.2|2.7|0.6|
ریحان تازه خشک‌شده|Fresh basil, dried|203|22.4|18.9|4.2|
ترخون تازه خام|Fresh tarragon, raw|50|3.8|7|0.8|
ترخون تازه خشک‌شده|Fresh tarragon, dried|353|26.6|49|5.6|
شنبلیله تازه خام|Fresh fenugreek leaves, raw|50|4.4|6|0.9|
شنبلیله تازه خشک‌شده|Fresh fenugreek leaves, dried|348|30.8|42|6.3|
شنبلیله تازه تفت‌داده با روغن|Fresh fenugreek leaves, sauteed in oil|110|5.7|7.8|6.2|
تره تازه (چایوز) خام|Garden chives, raw|37|3.3|4.4|0.7|
برگ تربچه|Radish leaves|25|1.9|4|0.2|
برگ تربچه آب‌پز|Radish leaves, boiled|25|1.9|4|0.2|
برگ تربچه تفت‌داده با روغن|Radish leaves, sauteed in oil|79|2.5|5.2|5.3|
سبزی خوردن مخلوط خام|Mixed fresh herbs, raw|35|2.5|5|0.5|
سبزی قورمه تازه خام|Fresh ghormeh sabzi herbs, raw|41|3|6|0.6|
سبزی قورمه تازه تفت‌داده با روغن|Fresh ghormeh sabzi herbs, sauteed in oil|99|3.9|7.8|5.8|
سبزی قورمه سرخ‌شده|Fried ghormeh sabzi herbs|160|4.5|8.5|12|
برگ مو خام|Grape leaves, raw|85|5.6|11|2.1|برگ مو (داخلی)
برگ مو آب‌پز|Grape leaves, boiled|85|5.6|11|2.1|برگ مو (داخلی)
برگ مو کنسروی|Grape leaves, canned|79|5|9.9|2.1|برگ مو (داخلی)
برگ کلم آب‌پز|Cabbage leaves, boiled|28|1.3|5.5|0.1|
برگ کلم بخارپز|Cabbage leaves, steamed|28|1.3|5.6|0.1|
برگ چغندر خام|Beet greens, raw|27|2.2|4.3|0.1|
برگ چغندر آب‌پز|Beet greens, boiled|27|2.2|4.3|0.1|
برگ چغندر تفت‌داده با روغن|Beet greens, sauteed in oil|80|2.9|5.6|5.1|
کلم کولارد (برگ کلم سبز) خام|Collard greens, raw|39|3|5.4|0.6|
کلم کولارد (برگ کلم سبز) آب‌پز|Collard greens, boiled|39|3|5.4|0.6|
کلم کولارد (برگ کلم سبز) تفت‌داده با روغن|Collard greens, sauteed in oil|96|3.9|7|5.8|
کلم کولارد (برگ کلم سبز) منجمد|Collard greens, frozen|38|2.9|5.3|0.6|
برگ شاهی خام|Watercress, raw|15|2.3|1.3|0.1|
شاهی باغی (گارد کرس) خام|Garden cress, raw|39|2.6|5.5|0.7|
کاسنی خام|Chicory greens, raw|28|1.7|4.7|0.3|
کاسنی آب‌پز|Chicory greens, boiled|28|1.7|4.7|0.3|
کاسنی تفت‌داده با روغن|Chicory greens, sauteed in oil|82|2.2|6.1|5.4|
کاسنی ریشه خام|Chicory root, raw|78|1.4|17.7|0.2|
کاسنی ریشه آب‌پز|Chicory root, boiled|78|1.4|17.7|0.2|
ریحان تایلندی خام|Thai basil, raw|29|3.2|2.7|0.6|
تمرهندی تازه خام|Fresh tamarind pods, raw|267|2.8|62.5|0.6|
اسفناج بچه (بیبی اسفناج) خام|Baby spinach, raw|30|2.9|3.6|0.4|
میکروگرین (سبزی ریز) خام|Microgreens, raw|31|3|4|0.3|
رازیانه غده‌ای خام|Fennel bulb, raw|36|1.2|7.3|0.2|رازیانه
رازیانه غده‌ای آب‌پز|Fennel bulb, boiled|36|1.2|7.3|0.2|رازیانه
رازیانه غده‌ای بخارپز|Fennel bulb, steamed|36|1.2|7.4|0.2|رازیانه
رازیانه غده‌ای کبابی (گریل)|Fennel bulb, grilled|50|1.4|8.4|1.2|رازیانه
رازیانه‌ی سبز خام|Fennel fronds, raw|46|3.2|6.3|0.9|
ریواس خام|Rhubarb, raw|23|0.9|4.5|0.2|
ریواس آب‌پز|Rhubarb, boiled|23|0.9|4.5|0.2|
ریواس منجمد|Rhubarb, frozen|23|0.9|4.4|0.2|
کاکتوس خوراکی (نوپال) خام|Nopal cactus, raw|19|1.3|3.3|0.1|
کاکتوس خوراکی (نوپال) آب‌پز|Nopal cactus, boiled|19|1.3|3.3|0.1|
کاکتوس خوراکی (نوپال) تفت‌داده با روغن|Nopal cactus, sauteed in oil|78|1.7|4|6.1|
کدو تلخ خام|Bitter melon, raw|21|1|3.7|0.2|
کدو تلخ آب‌پز|Bitter melon, boiled|19|1|3.3|0.2|
کدو تلخ تفت‌داده با روغن|Bitter melon, sauteed in oil|80|1.3|4.4|6.3|
کدو بطری خام|Bottle gourd, raw|16|0.6|3.4|0|
کدو بطری آب‌پز|Bottle gourd, boiled|15|0.6|3.1|0|
کدو بطری تفت‌داده با روغن|Bottle gourd, sauteed in oil|74|0.8|4.1|6|
کدو چینی (وکس) خام|Winter melon, raw|15|0.4|3|0.2|
کدو چینی (وکس) آب‌پز|Winter melon, boiled|14|0.4|2.7|0.2|
بروکلینی خام|Broccolini, raw|47|3.5|7|0.5|
بروکلینی آب‌پز|Broccolini, boiled|45|3.5|6.6|0.5|
بروکلینی بخارپز|Broccolini, steamed|46|3.6|6.8|0.5|
بروکلینی کبابی (گریل)|Broccolini, grilled|62|4|8|1.6|
جوانه بامبو (نی بامبو) خام|Bamboo shoots, raw|34|2.6|5.2|0.3|
جوانه بامبو (نی بامبو) آب‌پز|Bamboo shoots, boiled|34|2.6|5.2|0.3|
جوانه بامبو (نی بامبو) کنسروی|Bamboo shoots, canned|31|2.3|4.7|0.3|
ریشه نیلوفر آبی خام|Lotus root, raw|80|2.6|17.2|0.1|
ریشه نیلوفر آبی آب‌پز|Lotus root, boiled|80|2.6|17.2|0.1|
ریشه نیلوفر آبی تفت‌داده با روغن|Lotus root, sauteed in oil|151|3.4|20.6|6.1|
تارو خام|Taro root, raw|114|1.5|26.5|0.2|
تارو آب‌پز|Taro root, boiled|120|1.7|27.8|0.2|
تارو تفت‌داده با روغن|Taro root, sauteed in oil|230|2.1|34.5|9.3|
کاساوا (مانیوک) خام|Cassava, raw|160|1.4|38|0.3|کاساوا
کاساوا (مانیوک) آب‌پز|Cassava, boiled|168|1.5|39.9|0.3|کاساوا
کاساوا (مانیوک) تفت‌داده با روغن|Cassava, sauteed in oil|290|2|49.4|9.4|کاساوا
لوبیا بادامی تازه (ادامامه) خام|Edamame (green soybeans), raw|130|11.9|8.9|5.2|ادامامه
لوبیا بادامی تازه (ادامامه) آب‌پز|Edamame (green soybeans), boiled|132|11.9|9.3|5.2|ادامامه
لوبیا بادامی تازه (ادامامه) منجمد|Edamame (green soybeans), frozen|128|11.7|8.7|5.2|ادامامه
ترب سفید|White radish|20|0.6|4.1|0.1|
ترب سفید آب‌پز|White radish, boiled|20|0.6|4.1|0.1|
ترب سفید ترشی|White radish, pickled|17|0.4|3.6|0.1|
کرفس برگی خام|Celery leaves, raw|23|1.2|4|0.2|
سیرچه ترشی|Pickled green garlic|36|1.5|7|0.2|
پیاز ترشی (پیاز شور)|Pickled onion|30|0.8|6.5|0.1|
کلم ترش (ساورکراوت)|Sauerkraut|22|0.9|4.3|0.1|ساورکراوت
ترشی لبو (چغندر ترشی)|Pickled beet|41|1|9|0.1|
ترشی شلغم (شلغم لبو)|Pickled turnip|24|0.7|5|0.1|
ترشی تربچه|Pickled radish|15|0.5|3|0.1|
گوجه‌فرنگی خشک‌شده (آفتابی)|Sun-dried tomatoes|307|14.1|55.8|3|
گوجه‌فرنگی خشک در روغن|Sun-dried tomatoes in oil|238|5|23|14|
سس گوجه‌فرنگی پخته (پوره)|Tomato puree|41|1.6|8.3|0.1|
زیتون سبز|Green olives|157|1|3.8|15.3|
زیتون پرورده ایرانی|Persian marinated olives|152|1.5|5|14|زیتون پرورده
زیتون کنسروی بی‌هسته|Pitted canned olives|117|0.8|3.8|11|
زیتون شکم‌پر|Stuffed olives|124|1|3|12|
`;
const ING_FRUIT = `
سیب قرمز با پوست تازه|Red apple with skin, raw|58|0.3|13.8|0.2|سیب
سیب قرمز با پوست منجمد (بدون شکر)|Red apple with skin, frozen, unsweetened|57|0.3|13.4|0.2|
سیب قرمز با پوست کمپوت (در شربت)|Red apple with skin, canned in syrup|69|0.2|16.8|0.1|
سیب قرمز با پوست خشک‌شده|Red apple with skin, dried|332|1.7|78.9|1.1|
آب سیب قرمز با پوست تازه (صاف‌شده)|Red apple with skin juice, fresh|50|0.2|12.1|0.1|
سیب زرد با پوست تازه|Golden apple with skin, raw|59|0.3|14|0.2|
سیب سبز با پوست تازه|Green apple with skin, raw|57|0.4|13.5|0.2|
سیب گلاب تازه|Golab apple, raw|55|0.3|13|0.2|
سیب درختی بدون پوست تازه|Peeled apple, raw|58|0.3|13.8|0.2|
گلابی تازه|Pear, raw|63|0.4|15.2|0.1|
گلابی کمپوت (در شربت)|Pear, canned in syrup|72|0.2|17.6|0.1|
گلابی خشک‌شده|Pear, dried|297|1.9|71.2|0.5|
آب گلابی تازه (صاف‌شده)|Pear juice, fresh|55|0.3|13.4|0|
گلابی آسیایی تازه|Asian pear, raw|47|0.5|10.7|0.2|
به تازه|Quince, raw|64|0.4|15.3|0.1|به
هلو تازه|Peach, raw|44|0.9|9.5|0.3|
هلو منجمد (بدون شکر)|Peach, frozen, unsweetened|43|0.9|9.2|0.3|
هلو کمپوت (در شربت)|Peach, canned in syrup|61|0.5|14.2|0.2|
هلو خشک‌شده|Peach, dried|302|6.1|64.8|2|
آب هلو تازه (صاف‌شده)|Peach juice, fresh|37|0.6|8.4|0.1|
شلیل تازه|Nectarine, raw|50|1.1|10.6|0.3|
شلیل منجمد (بدون شکر)|Nectarine, frozen, unsweetened|48|1.1|10.3|0.3|
زردآلو منجمد (بدون شکر)|Apricot, frozen, unsweetened|52|1.4|10.8|0.4|
زردآلو کمپوت (در شربت)|Apricot, canned in syrup|66|0.8|15.2|0.2|
آب زردآلو تازه (صاف‌شده)|Apricot juice, fresh|45|1|9.8|0.2|
آلو زرد تازه|Yellow plum, raw|51|0.7|11.4|0.3|
آلو قرمز تازه|Red plum, raw|51|0.7|11.4|0.3|
آلو قرمز خشک‌شده|Red plum, dried|275|3.8|61.4|1.6|
آلو سیاه (آلو بخارا) تازه|Prune plum fresh, raw|51|0.7|11.4|0.3|
آلو سیاه (آلو بخارا) خشک‌شده|Prune plum fresh, dried|271|3.7|60.5|1.6|
آلوچه تازه|Cherry plum, raw|50|0.8|11|0.3|آلوچه
آلوچه خشک‌شده|Cherry plum, dried|268|4.3|59.2|1.6|
گوجه سبز تازه|Green plum (gojeh sabz), raw|44|0.8|9.5|0.3|
گیلاس منجمد (بدون شکر)|Sweet cherry, frozen, unsweetened|68|1|15.5|0.2|
گیلاس کمپوت (در شربت)|Sweet cherry, canned in syrup|76|0.6|18.1|0.1|
گیلاس خشک‌شده|Sweet cherry, dried|310|4.4|71.1|0.9|
آب گیلاس تازه (صاف‌شده)|Sweet cherry juice, fresh|60|0.7|14.1|0.1|
آلبالو منجمد (بدون شکر)|Sour cherry, frozen, unsweetened|54|1|11.8|0.3|
آلبالو کمپوت (در شربت)|Sour cherry, canned in syrup|67|0.6|15.8|0.2|
آلبالو خشک‌شده|Sour cherry, dried|317|5.7|69.7|1.7|
آب آلبالو تازه (صاف‌شده)|Sour cherry juice, fresh|46|0.7|10.7|0.1|
انگور قرمز تازه|Red grapes, raw|77|0.7|18.1|0.2|
انگور قرمز خشک‌شده|Red grapes, dried|345|3.1|81|0.9|
آب انگور قرمز تازه (صاف‌شده)|Red grapes juice, fresh|67|0.5|15.9|0.1|
انگور سبز تازه|Green grapes, raw|77|0.7|18.1|0.2|
انگور سبز خشک‌شده|Green grapes, dried|345|3.1|81|0.9|
آب انگور سبز تازه (صاف‌شده)|Green grapes juice, fresh|67|0.5|15.9|0.1|
انگور سیاه تازه|Black grapes, raw|73|0.7|17|0.2|
انگور بی‌دانه تازه|Seedless grapes, raw|73|0.7|17.2|0.2|
انگور یاقوتی تازه|Yaghouti grapes, raw|77|0.7|18|0.2|
انگور عسگری تازه|Askari grapes, raw|79|0.7|18.5|0.2|
انگور شاهرودی تازه|Shahroudi grapes, raw|78|0.7|18.3|0.2|
انگور فخری تازه|Fakhri grapes, raw|79|0.7|18.5|0.2|
انگور طائفی تازه|Taefi grapes, raw|77|0.7|18|0.2|
توت‌فرنگی تازه|Strawberry, raw|36|0.7|7.7|0.3|
توت‌فرنگی منجمد (بدون شکر)|Strawberry, frozen, unsweetened|36|0.7|7.5|0.3|
توت‌فرنگی کمپوت (در شربت)|Strawberry, canned in syrup|56|0.4|13.1|0.2|
توت‌فرنگی خشک‌شده|Strawberry, dried|327|6.3|69.3|2.7|
آب توت‌فرنگی تازه (صاف‌شده)|Strawberry juice, fresh|30|0.5|6.8|0.1|
تمشک تازه|Raspberry, raw|59|1.2|11.9|0.7|
تمشک منجمد (بدون شکر)|Raspberry, frozen, unsweetened|57|1.2|11.5|0.7|
تمشک خشک‌شده|Raspberry, dried|377|7.7|76.5|4.5|
آب تمشک تازه (صاف‌شده)|Raspberry juice, fresh|48|0.8|10.5|0.3|
شاه‌توت تازه|Mulberry, raw|48|1.4|9.8|0.4|توت
شاه‌توت خشک‌شده|Mulberry, dried|323|9.3|65.3|2.7|
آب شاه‌توت تازه (صاف‌شده)|Mulberry juice, fresh|40|1|8.6|0.2|
توت سفید تازه|White mulberry, raw|48|1.4|9.8|0.4|
توت سفید خشک‌شده|White mulberry, dried|323|9.3|65.3|2.7|
توت سیاه تازه|Black mulberry, raw|48|1.4|9.8|0.4|
توت سیاه خشک‌شده|Black mulberry, dried|323|9.3|65.3|2.7|
توت سیاه جنگلی (بلک‌بری) تازه|Blackberry, raw|49|1.4|9.6|0.5|
توت سیاه جنگلی (بلک‌بری) منجمد (بدون شکر)|Blackberry, frozen, unsweetened|47|1.4|9.3|0.5|
بلوبری تازه|Blueberry, raw|64|0.7|14.5|0.3|زغال اخته آمریکایی
بلوبری منجمد (بدون شکر)|Blueberry, frozen, unsweetened|62|0.7|14.1|0.3|
بلوبری خشک‌شده|Blueberry, dried|337|3.7|77|1.6|
آب بلوبری تازه (صاف‌شده)|Blueberry juice, fresh|54|0.5|12.8|0.1|
زغال‌اخته تازه|Cornelian cherry, raw|54|1|12|0.2|
زغال‌اخته خشک‌شده|Cornelian cherry, dried|287|5.3|64|1.1|
کرنبری تازه|Cranberry, raw|51|0.4|12.2|0.1|
کرنبری خشک‌شده|Cranberry, dried|336|2.6|79.8|0.7|
آب کرنبری تازه (صاف‌شده)|Cranberry juice, fresh|44|0.3|10.7|0|
انگور فرنگی تازه|Gooseberry, raw|50|0.9|10.2|0.6|
انگور فرنگی سیاه (کشمش سیاه)|Blackcurrant|71|1.4|15.4|0.4|
انگور فرنگی قرمز تازه|Red currant, raw|63|1.4|13.8|0.2|
گیلاس وحشی تازه|Wild cherry, raw|63|1|14|0.3|
پرتقال تازه|Orange, raw|52|0.9|11.8|0.1|
آب پرتقال تازه (صاف‌شده)|Orange juice, fresh|44|0.6|10.4|0|
پرتقال تامسون تازه|Thomson orange, raw|51|0.9|11.5|0.1|
آب پرتقال تامسون تازه (صاف‌شده)|Thomson orange juice, fresh|43|0.6|10.1|0|
پرتقال خونی تازه|Blood orange, raw|51|0.9|11.7|0.1|
آب پرتقال خونی تازه (صاف‌شده)|Blood orange juice, fresh|44|0.6|10.3|0|
پرتقال والنسیا تازه|Valencia orange, raw|52|0.9|11.8|0.1|
آب پرتقال والنسیا تازه (صاف‌شده)|Valencia orange juice, fresh|44|0.6|10.4|0|
نارنگی تازه|Tangerine, raw|59|0.8|13.3|0.3|
آب نارنگی تازه (صاف‌شده)|Tangerine juice, fresh|50|0.6|11.7|0.1|
نارنگی کمپوت (در شربت)|Tangerine, canned in syrup|70|0.5|16.5|0.2|
نارنگی کلمنتین تازه|Clementine, raw|53|0.9|12|0.2|
نارنگی انشو تازه|Unshiu mandarin, raw|51|0.8|11.5|0.2|
آب نارنج تازه (صاف‌شده)|Bitter orange juice, fresh|44|0.7|10.1|0.1|
لیمو ترش تازه|Lime, raw|47|0.7|10.5|0.2|
آب لیمو ترش تازه (صاف‌شده)|Lime juice, fresh|40|0.5|9.2|0.1|
آب لیمو شیرین تازه (صاف‌شده)|Sweet lime juice, fresh|33|0.5|7.6|0.1|
لیموی عمانی|Dried omani lime|278|6|60|1.5|لیمو عمانی
لیموی زرد (لمون) تازه|Lemon, raw|44|1.1|9.3|0.3|
آب لیموی زرد (لمون) تازه (صاف‌شده)|Lemon juice, fresh|37|0.8|8.2|0.1|
گریپ‌فروت تازه|Grapefruit, raw|47|0.8|10.7|0.1|
آب گریپ‌فروت تازه (صاف‌شده)|Grapefruit juice, fresh|40|0.6|9.4|0|
گریپ‌فروت کمپوت (در شربت)|Grapefruit, canned in syrup|63|0.5|14.9|0.1|
گریپ‌فروت صورتی تازه|Pink grapefruit, raw|47|0.8|10.7|0.1|
پوملو تازه|Pomelo, raw|42|0.8|9.6|0|
بالنگ تازه|Citron, raw|42|0.9|9|0.3|
کامکوات تازه|Kumquat, raw|79|1.9|15.9|0.9|
موز تازه|Banana, raw|98|1.1|22.8|0.3|
موز منجمد (بدون شکر)|Banana, frozen, unsweetened|96|1.1|22.1|0.3|
موز خشک‌شده|Banana, dried|315|3.5|73|1|
آب موز تازه (صاف‌شده)|Banana juice, fresh|85|0.8|20.1|0.1|
موز کوچک (بیبی) تازه|Baby banana, raw|99|1.1|23|0.3|
موز پلانتین تازه|Plantain, raw|136|1.3|31.9|0.4|
آناناس منجمد (بدون شکر)|Pineapple, frozen, unsweetened|54|0.5|12.7|0.1|
آناناس کمپوت (در شربت)|Pineapple, canned in syrup|68|0.3|16.4|0.1|
آناناس خشک‌شده|Pineapple, dried|317|2.9|74.9|0.6|
آب آناناس تازه (صاف‌شده)|Pineapple juice, fresh|47|0.3|11.5|0|
انبه تازه|Mango, raw|67|0.8|15|0.4|
انبه منجمد (بدون شکر)|Mango, frozen, unsweetened|65|0.8|14.5|0.4|
انبه کمپوت (در شربت)|Mango, canned in syrup|74|0.5|17.5|0.2|
انبه خشک‌شده|Mango, dried|315|3.8|70.6|1.9|
آب انبه تازه (صاف‌شده)|Mango juice, fresh|57|0.6|13.2|0.2|
انبه سبز تازه|Green mango, raw|63|0.8|14|0.4|
پاپایا تازه|Papaya, raw|48|0.5|10.8|0.3|
پاپایا منجمد (بدون شکر)|Papaya, frozen, unsweetened|47|0.5|10.5|0.3|
پاپایا کمپوت (در شربت)|Papaya, canned in syrup|63|0.3|15|0.2|
پاپایا خشک‌شده|Papaya, dried|319|3.3|72|2|
آب پاپایا تازه (صاف‌شده)|Papaya juice, fresh|40|0.3|9.5|0.1|
کیوی سبز تازه|Green kiwi, raw|68|1.1|14.7|0.5|کیوی
کیوی سبز منجمد (بدون شکر)|Green kiwi, frozen, unsweetened|66|1.1|14.3|0.5|
آب کیوی سبز تازه (صاف‌شده)|Green kiwi juice, fresh|57|0.8|12.9|0.2|
کیوی طلایی تازه|Gold kiwi, raw|70|1.1|15.8|0.3|
آووکادو هاس تازه|Hass avocado, raw|174|2|8.5|14.7|آووکادو
آووکادو هاس منجمد (بدون شکر)|Hass avocado, frozen, unsweetened|173|2|8.2|14.7|
آووکادو فوئرته تازه|Fuerte avocado, raw|161|1.9|8|13.5|
انار تازه|Pomegranate, raw|92|1.7|18.7|1.2|
آب انار تازه (صاف‌شده)|Pomegranate juice, fresh|75|1.2|16.5|0.5|
انار ترش تازه|Sour pomegranate, raw|75|1.5|15|1|
آب انار ترش تازه (صاف‌شده)|Sour pomegranate juice, fresh|60|1|13.2|0.4|
انجیر تازه تازه|Fresh fig, raw|83|0.8|19.2|0.3|انجیر
انجیر تازه کمپوت (در شربت)|Fresh fig, canned in syrup|84|0.5|20|0.2|
انجیر تازه خشک‌شده|Fresh fig, dried|276|2.7|64|1|
انجیر سیاه تازه|Black fig, raw|83|0.8|19.2|0.3|
انجیر زرد تازه|Yellow fig, raw|82|0.8|19|0.3|
خرما رطب|Fresh date (rotab)|168|1.5|40|0.2|رطب
خرما مضافتی|Mazafati dates|309|1.8|75|0.2|
خرما زاهدی|Zahedi dates|299|2|72|0.3|
خرما کبکاب|Kabkab dates|306|2|74|0.2|
خرما پیارم|Piarom dates|302|2|73|0.2|
خرما دگلت نور|Deglet Noor dates|314|2.5|75|0.4|
خرما مجهول|Medjool dates|309|1.8|75|0.2|
خرما استعمران|Estamaran dates|310|2|75|0.2|
خرما شاهانی|Shahani dates|306|2|74|0.2|
خرما خشک کامل|Dried whole dates|314|2.5|75|0.4|
هندوانه تازه|Watermelon, raw|35|0.6|7.6|0.2|
آب هندوانه تازه (صاف‌شده)|Watermelon juice, fresh|29|0.4|6.7|0.1|
هندوانه بی‌دانه تازه|Seedless watermelon, raw|35|0.6|7.6|0.2|
خربزه تازه|Cantaloupe, raw|38|0.8|8.2|0.2|
آب خربزه تازه (صاف‌شده)|Cantaloupe juice, fresh|32|0.6|7.2|0.1|
طالبی تازه|Honeydew (taleby), raw|39|0.5|9.1|0.1|
آب طالبی تازه (صاف‌شده)|Honeydew (taleby) juice, fresh|33|0.3|8|0|
گرمک تازه|Persian melon (garmak), raw|39|0.8|8.5|0.2|
خربزه ایرانی زرد تازه|Yellow Persian melon, raw|39|0.8|8.5|0.2|
طالبی مشهدی تازه|Mashhadi melon, raw|41|0.6|9.5|0.1|
خربزه شیرین (آبی) تازه|Sweet melon, raw|40|0.8|8.8|0.2|
ملون گالیا تازه|Galia melon, raw|42|0.8|9.5|0.1|
میوه کاکتوس (انجیر هندی) تازه|Prickly pear, raw|46|0.7|9.6|0.5|
گواوا تازه|Guava, raw|77|2.6|14.3|1|گواوا
گواوا کمپوت (در شربت)|Guava, canned in syrup|80|1.6|17.1|0.6|
آب گواوا تازه (صاف‌شده)|Guava juice, fresh|61|1.8|12.6|0.4|
میوه کارامبولا تازه|Star fruit, raw|34|1|6.7|0.3|
میوه دراگون (پیتایا) تازه|Dragon fruit, raw|44|1.2|9|0.4|
میوه دراگون (پیتایا) منجمد (بدون شکر)|Dragon fruit, frozen, unsweetened|43|1.2|8.7|0.4|
میوه پشن‌فروت تازه|Passion fruit, raw|109|2.2|23.4|0.7|
آب میوه پشن‌فروت تازه (صاف‌شده)|Passion fruit juice, fresh|91|1.5|20.6|0.3|
لیچی تازه|Lychee, raw|73|0.8|16.5|0.4|
لیچی کمپوت (در شربت)|Lychee, canned in syrup|77|0.5|18.4|0.2|
لیچی خشک‌شده|Lychee, dried|324|3.6|73.3|1.8|
رامبوتان تازه|Rambutan, raw|89|0.9|20.9|0.2|
لانگان تازه|Longan, raw|67|1.3|15.1|0.1|
نارگیل تازه (گوشت) تازه|Fresh coconut meat, raw|376|3.3|15.2|33.5|
جک‌فروت تازه|Jackfruit, raw|105|1.7|23.3|0.6|
جک‌فروت کمپوت (در شربت)|Jackfruit, canned in syrup|98|1|22.5|0.4|
دوریان تازه|Durian, raw|162|1.5|27.1|5.3|
چیکو (ساپوتا)|Sapodilla|91|0.4|19.9|1.1|
خرمالو (کاکی)|Persimmon|79|0.6|18.6|0.2|خرمالو
خرمالو شارون|Sharon fruit|64|0.6|15|0.2|
عناب تازه|Fresh jujube|87|1.2|20.2|0.2|
ازگیل تازه|Medlar, raw|103|0.5|24|0.5|
تمر هندی خمیر|Tamarind pulp|267|2.8|62.5|0.6|تمرهندی
میوه سیب هندی (کاستارد اپل) تازه|Custard apple, raw|112|1.7|25|0.6|
میوه بائوباب تازه|Baobab fruit, raw|340|2.3|82|0.3|
میوه مانگوستین تازه|Mangosteen, raw|79|0.4|18|0.6|
میوه گوجی‌بری (کاکوتی) تازه|Goji berries, raw|368|14|77|0.4|گوجی بری
لواشک میوه‌ای|Fruit leather (lavashak)|311|1.5|75|0.5|لواشک
قیسی (زردآلو خشک)|Dried apricot (qeysi)|270|3.4|63|0.5|قیصی
شفتالو (هلوی خشک)|Dried peach|298|3.6|69|0.8|
پاپایا خشک|Dried papaya|319|0.5|78|0.5|
انجیر خشک استهبان|Estahban dried figs|279|3.5|64|1|
آلو خشک بخارا|Dried prunes|268|2.2|63.9|0.4|
انگور خشک|Dried grapes|333|3.1|79|0.5|
کرنبری خشک|Dried cranberries|344|0.1|82.8|1.4|
کرنبری خشک شیرین‌شده|Sweetened dried cranberries|344|0.1|82.8|1.4|
توت‌فرنگی خشک|Dried strawberries|345|3|82|0.5|
میوه خشک مخلوط|Mixed dried fruit|319|2.5|76|0.5|
مخلوط میوه خشک و مغز|Dried fruit and nut mix|348|5|55|12|
`;
const ING_GRAIN = `
برنج طارم خام|Tarom rice, raw|346|7.2|78|0.6|برنج ایرانی
برنج طارم پخته (آب‌پز)|Tarom rice, cooked|119|2.5|26.9|0.2|برنج ایرانی
برنج طارم پخته (کته)|Tarom rice, cooked as kateh|147|3|32.5|0.6|برنج ایرانی
برنج طارم پلو آب‌کشی‌شده با روغن|Tarom rice, polo with oil|134|2.3|25.2|2.7|برنج ایرانی
برنج طارم پلو با ته‌دیگ روغنی|Tarom rice, polo with tahdig|169|2.8|30|4.2|برنج ایرانی
برنج هاشمی خام|Hashemi rice, raw|346|7.2|78|0.6|
برنج هاشمی پخته (آب‌پز)|Hashemi rice, cooked|119|2.5|26.9|0.2|
برنج هاشمی پخته (کته)|Hashemi rice, cooked as kateh|147|3|32.5|0.6|
برنج هاشمی پلو آب‌کشی‌شده با روغن|Hashemi rice, polo with oil|134|2.3|25.2|2.7|
برنج هاشمی پلو با ته‌دیگ روغنی|Hashemi rice, polo with tahdig|169|2.8|30|4.2|
برنج دم‌سیاه خام|Dom siyah rice, raw|346|7.2|78|0.6|دم سیاه
برنج دم‌سیاه پخته (آب‌پز)|Dom siyah rice, cooked|119|2.5|26.9|0.2|دم سیاه
برنج دم‌سیاه پخته (کته)|Dom siyah rice, cooked as kateh|147|3|32.5|0.6|دم سیاه
برنج دم‌سیاه پلو آب‌کشی‌شده با روغن|Dom siyah rice, polo with oil|134|2.3|25.2|2.7|دم سیاه
برنج دم‌سیاه پلو با ته‌دیگ روغنی|Dom siyah rice, polo with tahdig|169|2.8|30|4.2|دم سیاه
برنج فجر خام|Fajr rice, raw|350|7.2|79|0.6|
برنج فجر پخته (آب‌پز)|Fajr rice, cooked|121|2.5|27.2|0.2|
برنج فجر پخته (کته)|Fajr rice, cooked as kateh|149|3|32.9|0.6|
برنج فجر پلو آب‌کشی‌شده با روغن|Fajr rice, polo with oil|136|2.3|25.5|2.7|
برنج فجر پلو با ته‌دیگ روغنی|Fajr rice, polo with tahdig|171|2.8|30.4|4.2|
برنج صدری خام|Sadri rice, raw|346|7.2|78|0.6|
برنج صدری پخته (آب‌پز)|Sadri rice, cooked|119|2.5|26.9|0.2|
برنج صدری پخته (کته)|Sadri rice, cooked as kateh|147|3|32.5|0.6|
برنج صدری پلو آب‌کشی‌شده با روغن|Sadri rice, polo with oil|134|2.3|25.2|2.7|
برنج صدری پلو با ته‌دیگ روغنی|Sadri rice, polo with tahdig|169|2.8|30|4.2|
برنج کامفیروزی خام|Kamfiruzi rice, raw|346|7.2|78|0.6|
برنج کامفیروزی پخته (آب‌پز)|Kamfiruzi rice, cooked|119|2.5|26.9|0.2|
برنج کامفیروزی پخته (کته)|Kamfiruzi rice, cooked as kateh|147|3|32.5|0.6|
برنج کامفیروزی پلو آب‌کشی‌شده با روغن|Kamfiruzi rice, polo with oil|134|2.3|25.2|2.7|
برنج کامفیروزی پلو با ته‌دیگ روغنی|Kamfiruzi rice, polo with tahdig|169|2.8|30|4.2|
برنج لنجان خام|Lenjan rice, raw|346|7.2|78|0.6|
برنج لنجان پخته (آب‌پز)|Lenjan rice, cooked|119|2.5|26.9|0.2|
برنج لنجان پخته (کته)|Lenjan rice, cooked as kateh|147|3|32.5|0.6|
برنج لنجان پلو آب‌کشی‌شده با روغن|Lenjan rice, polo with oil|134|2.3|25.2|2.7|
برنج لنجان پلو با ته‌دیگ روغنی|Lenjan rice, polo with tahdig|169|2.8|30|4.2|
برنج عنبربو خام|Anbarbu rice, raw|347|7.3|78|0.6|عنبر بو
برنج عنبربو پخته (آب‌پز)|Anbarbu rice, cooked|119|2.5|26.9|0.2|عنبر بو
برنج عنبربو پخته (کته)|Anbarbu rice, cooked as kateh|147|3|32.5|0.6|عنبر بو
برنج عنبربو پلو آب‌کشی‌شده با روغن|Anbarbu rice, polo with oil|135|2.4|25.2|2.7|عنبر بو
برنج عنبربو پلو با ته‌دیگ روغنی|Anbarbu rice, polo with tahdig|169|2.8|30|4.2|عنبر بو
برنج نیم‌دانه خام|Short-grain rice (nim-daneh), raw|349|7|79|0.6|
برنج نیم‌دانه پخته (آب‌پز)|Short-grain rice (nim-daneh), cooked|125|2.5|28.2|0.2|
برنج نیم‌دانه پخته (کته)|Short-grain rice (nim-daneh), cooked as kateh|155|3|34.3|0.6|
برنج نیم‌دانه پلو آب‌کشی‌شده با روغن|Short-grain rice (nim-daneh), polo with oil|139|2.3|26.3|2.7|
برنج نیم‌دانه پلو با ته‌دیگ روغنی|Short-grain rice (nim-daneh), polo with tahdig|175|2.8|31.6|4.2|
برنج گرده خام|Gerdeh rice, raw|349|7|79|0.6|
برنج گرده پخته (آب‌پز)|Gerdeh rice, cooked|125|2.5|28.2|0.2|
برنج گرده پخته (کته)|Gerdeh rice, cooked as kateh|155|3|34.3|0.6|
برنج گرده پلو آب‌کشی‌شده با روغن|Gerdeh rice, polo with oil|139|2.3|26.3|2.7|
برنج گرده پلو با ته‌دیگ روغنی|Gerdeh rice, polo with tahdig|175|2.8|31.6|4.2|
برنج شیرودی خام|Shiroudi rice, raw|346|7.2|78|0.6|
برنج شیرودی پخته (آب‌پز)|Shiroudi rice, cooked|119|2.5|26.9|0.2|
برنج شیرودی پخته (کته)|Shiroudi rice, cooked as kateh|147|3|32.5|0.6|
برنج شیرودی پلو آب‌کشی‌شده با روغن|Shiroudi rice, polo with oil|134|2.3|25.2|2.7|
برنج شیرودی پلو با ته‌دیگ روغنی|Shiroudi rice, polo with tahdig|169|2.8|30|4.2|
برنج خزر خام|Khazar rice, raw|346|7.2|78|0.6|
برنج خزر پخته (آب‌پز)|Khazar rice, cooked|119|2.5|26.9|0.2|
برنج خزر پخته (کته)|Khazar rice, cooked as kateh|147|3|32.5|0.6|
برنج خزر پلو آب‌کشی‌شده با روغن|Khazar rice, polo with oil|134|2.3|25.2|2.7|
برنج خزر پلو با ته‌دیگ روغنی|Khazar rice, polo with tahdig|169|2.8|30|4.2|
برنج علی کاظمی خام|Ali Kazemi rice, raw|346|7.2|78|0.6|
برنج علی کاظمی پخته (آب‌پز)|Ali Kazemi rice, cooked|119|2.5|26.9|0.2|
برنج علی کاظمی پخته (کته)|Ali Kazemi rice, cooked as kateh|147|3|32.5|0.6|
برنج علی کاظمی پلو آب‌کشی‌شده با روغن|Ali Kazemi rice, polo with oil|134|2.3|25.2|2.7|
برنج علی کاظمی پلو با ته‌دیگ روغنی|Ali Kazemi rice, polo with tahdig|169|2.8|30|4.2|
برنج پاکستانی خام|Pakistani basmati rice, raw|345|7.1|78|0.5|
برنج پاکستانی پخته (آب‌پز)|Pakistani basmati rice, cooked|115|2.4|26|0.2|
برنج پاکستانی پخته (کته)|Pakistani basmati rice, cooked as kateh|141|2.8|31.2|0.5|
برنج پاکستانی پلو آب‌کشی‌شده با روغن|Pakistani basmati rice, polo with oil|131|2.2|24.4|2.7|
برنج پاکستانی پلو با ته‌دیگ روغنی|Pakistani basmati rice, polo with tahdig|164|2.6|28.9|4.2|
برنج هندی باسماتی خام|Basmati rice, raw|345|7.1|78|0.5|باسماتی
برنج هندی باسماتی پخته (آب‌پز)|Basmati rice, cooked|115|2.4|26|0.2|باسماتی
برنج هندی باسماتی پخته (کته)|Basmati rice, cooked as kateh|141|2.8|31.2|0.5|باسماتی
برنج هندی باسماتی پلو آب‌کشی‌شده با روغن|Basmati rice, polo with oil|131|2.2|24.4|2.7|باسماتی
برنج هندی باسماتی پلو با ته‌دیگ روغنی|Basmati rice, polo with tahdig|164|2.6|28.9|4.2|باسماتی
برنج یاسمین (جاسمین) خام|Jasmine rice, raw|349|7|79|0.6|جاسمین
برنج یاسمین (جاسمین) پخته (آب‌پز)|Jasmine rice, cooked|120|2.4|27.2|0.2|جاسمین
برنج یاسمین (جاسمین) پخته (کته)|Jasmine rice, cooked as kateh|149|2.9|32.9|0.6|جاسمین
برنج یاسمین (جاسمین) پلو آب‌کشی‌شده با روغن|Jasmine rice, polo with oil|136|2.3|25.5|2.7|جاسمین
برنج یاسمین (جاسمین) پلو با ته‌دیگ روغنی|Jasmine rice, polo with tahdig|170|2.7|30.4|4.2|جاسمین
برنج قهوه‌ای پخته (آب‌پز)|Brown rice, cooked|140|3|29.6|1.1|
برنج قهوه‌ای پخته (کته)|Brown rice, cooked as kateh|177|3.8|36.7|1.7|
برنج قهوه‌ای پلو آب‌کشی‌شده با روغن|Brown rice, polo with oil|153|2.8|27.5|3.5|
برنج قهوه‌ای پلو با ته‌دیگ روغنی|Brown rice, polo with tahdig|195|3.4|33.5|5.3|
برنج قهوه‌ای باسماتی خام|Brown basmati rice, raw|356|8|75|2.7|
برنج قهوه‌ای باسماتی پخته (آب‌پز)|Brown basmati rice, cooked|137|3.1|28.8|1|
برنج قهوه‌ای باسماتی پخته (کته)|Brown basmati rice, cooked as kateh|172|3.8|35.7|1.6|
برنج قهوه‌ای باسماتی پلو آب‌کشی‌شده با روغن|Brown basmati rice, polo with oil|150|2.9|26.8|3.5|
برنج قهوه‌ای باسماتی پلو با ته‌دیگ روغنی|Brown basmati rice, polo with tahdig|191|3.5|32.6|5.2|
برنج سیاه خام|Black rice, raw|366|8.5|75|3.5|
برنج سیاه پخته (آب‌پز)|Black rice, cooked|135|3.1|27.8|1.3|
برنج سیاه پخته (کته)|Black rice, cooked as kateh|169|3.9|34.1|1.9|
برنج سیاه پلو آب‌کشی‌شده با روغن|Black rice, polo with oil|149|2.9|25.9|3.7|
برنج سیاه پلو با ته‌دیگ روغنی|Black rice, polo with tahdig|188|3.5|31.2|5.5|
برنج قرمز خام|Red rice, raw|355|8|75|2.5|
برنج قرمز پخته (آب‌پز)|Red rice, cooked|137|3.1|28.8|1|
برنج قرمز پخته (کته)|Red rice, cooked as kateh|172|3.8|35.7|1.5|
برنج قرمز پلو آب‌کشی‌شده با روغن|Red rice, polo with oil|149|2.9|26.8|3.4|
برنج قرمز پلو با ته‌دیگ روغنی|Red rice, polo with tahdig|190|3.5|32.6|5.1|
برنج وحشی خام|Wild rice, raw|369|14.7|75|1.1|
برنج وحشی پخته (آب‌پز)|Wild rice, cooked|119|4.7|24.2|0.4|
برنج وحشی پخته (کته)|Wild rice, cooked as kateh|144|5.7|28.8|0.7|
برنج وحشی پلو آب‌کشی‌شده با روغن|Wild rice, polo with oil|134|4.5|22.7|2.8|
برنج وحشی پلو با ته‌دیگ روغنی|Wild rice, polo with tahdig|168|5.2|26.8|4.4|
برنج آربوریو (ریزوتو) خام|Arborio rice, raw|352|6.7|80|0.6|
برنج آربوریو (ریزوتو) پخته (آب‌پز)|Arborio rice, cooked|130|2.5|29.6|0.2|
برنج آربوریو (ریزوتو) پخته (کته)|Arborio rice, cooked as kateh|163|3|36.4|0.6|
برنج آربوریو (ریزوتو) پلو آب‌کشی‌شده با روغن|Arborio rice, polo with oil|144|2.3|27.6|2.7|
برنج آربوریو (ریزوتو) پلو با ته‌دیگ روغنی|Arborio rice, polo with tahdig|183|2.8|33.3|4.3|
برنج سوشی خام|Sushi rice, raw|351|6.5|80|0.5|
برنج سوشی پخته (آب‌پز)|Sushi rice, cooked|130|2.4|29.6|0.2|
برنج سوشی پخته (کته)|Sushi rice, cooked as kateh|162|3|36.4|0.5|
برنج سوشی پلو آب‌کشی‌شده با روغن|Sushi rice, polo with oil|144|2.2|27.6|2.7|
برنج سوشی پلو با ته‌دیگ روغنی|Sushi rice, polo with tahdig|182|2.7|33.3|4.2|
برنج چسبناک خام|Glutinous rice, raw|357|6.8|81|0.6|
برنج چسبناک پخته (آب‌پز)|Glutinous rice, cooked|162|3.1|36.8|0.3|
برنج چسبناک پخته (کته)|Glutinous rice, cooked as kateh|213|4|47.6|0.7|
برنج چسبناک پلو آب‌کشی‌شده با روغن|Glutinous rice, polo with oil|171|2.8|33.7|2.8|
برنج چسبناک پلو با ته‌دیگ روغنی|Glutinous rice, polo with tahdig|224|3.6|42.6|4.3|
برنج پارابویل (ایرانی) خام|Parboiled rice, raw|352|7|80|0.4|
برنج پارابویل (ایرانی) پخته (آب‌پز)|Parboiled rice, cooked|121|2.4|27.6|0.1|
برنج پارابویل (ایرانی) پخته (کته)|Parboiled rice, cooked as kateh|149|2.9|33.3|0.5|
برنج پارابویل (ایرانی) پلو آب‌کشی‌شده با روغن|Parboiled rice, polo with oil|136|2.3|25.8|2.6|
برنج پارابویل (ایرانی) پلو با ته‌دیگ روغنی|Parboiled rice, polo with tahdig|172|2.7|30.8|4.2|
برنج سفید دانه بلند خام|Long-grain white rice, raw|355|7.1|80|0.7|
برنج سفید دانه بلند پخته (آب‌پز)|Long-grain white rice, cooked|122|2.4|27.6|0.2|
برنج سفید دانه بلند پخته (کته)|Long-grain white rice, cooked as kateh|151|3|33.3|0.6|
برنج سفید دانه بلند پلو آب‌کشی‌شده با روغن|Long-grain white rice, polo with oil|137|2.3|25.8|2.7|
برنج سفید دانه بلند پلو با ته‌دیگ روغنی|Long-grain white rice, polo with tahdig|173|2.7|30.8|4.3|
برنج سفید دانه کوتاه خام|Short-grain white rice, raw|351|6.5|80|0.5|
برنج سفید دانه کوتاه پخته (آب‌پز)|Short-grain white rice, cooked|125|2.3|28.6|0.2|
برنج سفید دانه کوتاه پخته (کته)|Short-grain white rice, cooked as kateh|155|2.8|34.8|0.5|
برنج سفید دانه کوتاه پلو آب‌کشی‌شده با روغن|Short-grain white rice, polo with oil|140|2.2|26.7|2.7|
برنج سفید دانه کوتاه پلو با ته‌دیگ روغنی|Short-grain white rice, polo with tahdig|176|2.6|32|4.2|
برنج بلغور (شکسته) خام|Broken rice, raw|349|7|79|0.6|
برنج بلغور (شکسته) پخته (آب‌پز)|Broken rice, cooked|120|2.4|27.2|0.2|
برنج بلغور (شکسته) پخته (کته)|Broken rice, cooked as kateh|149|2.9|32.9|0.6|
برنج بلغور (شکسته) پلو آب‌کشی‌شده با روغن|Broken rice, polo with oil|136|2.3|25.5|2.7|
برنج بلغور (شکسته) پلو با ته‌دیگ روغنی|Broken rice, polo with tahdig|170|2.7|30.4|4.2|
بلغور گندم درشت خام|Coarse bulgur, raw|365|12.3|76|1.3|
بلغور گندم درشت پخته (آب‌پز)|Coarse bulgur, cooked|131|4.4|27.1|0.5|
بلغور گندم ریز خام|Fine bulgur, raw|365|12.3|76|1.3|
بلغور گندم ریز پخته (آب‌پز)|Fine bulgur, cooked|131|4.4|27.1|0.5|
بلغور جو خام|Barley grits, raw|355|10|76|1.2|
بلغور جو پخته (آب‌پز)|Barley grits, cooked|118|3.3|25.3|0.4|
کینوآ سفید خام|White quinoa, raw|367|14.1|64|6.1|
کینوآ سفید پخته (آب‌پز)|White quinoa, cooked|131|5|22.9|2.2|
کینوآ قرمز خام|Red quinoa, raw|367|14.1|64|6.1|
کینوآ قرمز پخته (آب‌پز)|Red quinoa, cooked|131|5|22.9|2.2|
کینوآ سیاه خام|Black quinoa, raw|367|14.1|64|6.1|
کینوآ سیاه پخته (آب‌پز)|Black quinoa, cooked|131|5|22.9|2.2|
فریکه خام|Freekeh, raw|350|13|70|2|فریکه
فریکه پخته (آب‌پز)|Freekeh, cooked|125|4.6|25|0.7|فریکه
کوسکوس خام|Couscous, raw|365|12.8|77|0.6|
کوسکوس پخته (آب‌پز)|Couscous, cooked|130|4.6|27.5|0.2|
کوسکوس سبوس‌دار خام|Whole wheat couscous, raw|353|12.7|72|1.6|
کوسکوس سبوس‌دار پخته (آب‌پز)|Whole wheat couscous, cooked|126|4.5|25.7|0.6|
ارزن خام|Millet, raw|374|11|73|4.2|
ارزن پخته (آب‌پز)|Millet, cooked|125|3.7|24.3|1.4|
ذرت خوشه‌ای (سورگوم) خام|Sorghum, raw|375|11.3|75|3.3|
ذرت خوشه‌ای (سورگوم) پخته (آب‌پز)|Sorghum, cooked|134|4|26.8|1.2|
آمارانت خام|Amaranth, raw|377|13.6|65|7|
آمارانت پخته (آب‌پز)|Amaranth, cooked|145|5.2|25|2.7|
گندم سیاه (باک‌ویت) خام|Buckwheat groats, raw|370|13.3|71.5|3.4|
گندم سیاه (باک‌ویت) پخته (آب‌پز)|Buckwheat groats, cooked|148|5.3|28.6|1.4|
ترف (تف) خام|Teff, raw|367|13.3|73|2.4|
ترف (تف) پخته (آب‌پز)|Teff, cooked|132|4.8|26.1|0.9|
جو پوست‌کنده پخته (آب‌پز)|Hulled barley, cooked|122|4.2|24.5|0.8|
جو پرک‌شده خام|Pearled barley, raw|361|9.9|77.7|1.2|جو مرواریدی
جو پرک‌شده پخته (آب‌پز)|Pearled barley, cooked|103|2.8|22.2|0.3|جو مرواریدی
جو دوسر کامل (دانه) خام|Oat groats, raw|383|13.2|68|6.5|
جو دوسر کامل (دانه) پخته (آب‌پز)|Oat groats, cooked|160|5.5|28.3|2.7|
جو دوسر پرک‌شده درشت خام|Rolled oats, raw|382|13.2|67.7|6.5|اوتمیل
جو دوسر پرک‌شده درشت پخته (آب‌پز)|Rolled oats, cooked|153|5.3|27.1|2.6|اوتمیل
جو دوسر فوری خام|Instant oats, raw|383|13|68|6.5|
جو دوسر فوری پخته (آب‌پز)|Instant oats, cooked|153|5.2|27.2|2.6|
جو دوسر استیل کات خام|Steel-cut oats, raw|374|12.5|68|5.8|
جو دوسر استیل کات پخته (آب‌پز)|Steel-cut oats, cooked|129|4.3|23.4|2|
چاودار خام|Rye, raw|359|10.3|75.9|1.6|
چاودار پخته (آب‌پز)|Rye, cooked|143|4.1|30.4|0.6|
اسپلت خام|Spelt, raw|361|14.6|70.2|2.4|
اسپلت پخته (آب‌پز)|Spelt, cooked|151|6.1|29.3|1|
فارو خام|Farro, raw|347|14|67|2.5|
فارو پخته (آب‌پز)|Farro, cooked|144|5.8|27.9|1|
گندم کامل (دانه) خام|Whole wheat berries, raw|359|13.2|71|2.5|گندم
گندم کامل (دانه) پخته (آب‌پز)|Whole wheat berries, cooked|144|5.3|28.4|1|گندم
گندم پوست‌کنده (دانه) خام|Hulled wheat, raw|352|12|72|1.8|
گندم پوست‌کنده (دانه) پخته (آب‌پز)|Hulled wheat, cooked|141|4.8|28.8|0.7|
گندم برشته خام|Toasted wheat, raw|354|12|72|2|
سمولینا خام|Semolina, raw|352|12.7|72.8|1.1|سمولینا
سمولینا پخته (آب‌پز)|Semolina, cooked|70|2.5|14.6|0.2|سمولینا
گریتس ذرت خام|Corn grits, raw|362|8.8|79|1.2|
گریتس ذرت پخته (آب‌پز)|Corn grits, cooked|81|2|17.6|0.3|
پولنتا خام|Polenta (cornmeal), raw|372|8|77|3.6|
پولنتا پخته (آب‌پز)|Polenta (cornmeal), cooked|83|1.8|17.1|0.8|
ذرت آسیاب‌شده (آرد ذرت زرد) خام|Yellow cornmeal, raw|371|7.1|76.9|3.9|
ذرت آسیاب‌شده (آرد ذرت زرد) پخته (آب‌پز)|Yellow cornmeal, cooked|83|1.6|17.1|0.9|
جو پوست‌کنده کامل سبوس‌دار خام|Whole hulled barley, raw|365|12.5|73.5|2.3|
جو پوست‌کنده کامل سبوس‌دار پخته (آب‌پز)|Whole hulled barley, cooked|122|4.2|24.5|0.8|
ماش خردشده خام|Split mung (as grain), raw|359|24|63|1.2|
ماش خردشده پخته (آب‌پز)|Split mung (as grain), cooked|144|9.6|25.2|0.5|
فرنی (آرد برنج پخته با شیر) خام|Rice flour pudding (farni), raw|96|2.5|17|2|
اسپاگتی خشک|Spaghetti, dry|362|13|74|1.5|
اسپاگتی سبوس‌دار خشک|Whole wheat spaghetti, dry|366|13.5|72|2.7|
اسپاگتی سبوس‌دار پخته|Whole wheat spaghetti, cooked|166|6.1|32.7|1.2|
ماکارونی پنه خشک|Penne, dry|362|13|74|1.5|
ماکارونی پنه پخته|Penne, cooked|164|5.9|33.6|0.7|
ماکارونی فوسیلی خشک|Fusilli, dry|362|13|74|1.5|
ماکارونی فوسیلی پخته|Fusilli, cooked|164|5.9|33.6|0.7|
ماکارونی آرنجی خشک|Elbow macaroni, dry|362|13|74|1.5|
ماکارونی آرنجی پخته|Elbow macaroni, cooked|164|5.9|33.6|0.7|
ماکارونی فارفاله خشک|Farfalle, dry|362|13|74|1.5|
ماکارونی فارفاله پخته|Farfalle, cooked|164|5.9|33.6|0.7|
ماکارونی لازانیا (ورق) خشک|Lasagna sheets, dry|362|13|74|1.5|
ماکارونی لازانیا (ورق) پخته|Lasagna sheets, cooked|164|5.9|33.6|0.7|
ماکارونی لینگوینی خشک|Linguine, dry|362|13|74|1.5|
ماکارونی لینگوینی پخته|Linguine, cooked|164|5.9|33.6|0.7|
ماکارونی فتوچینی خشک|Fettuccine, dry|362|12.5|74|1.8|
ماکارونی فتوچینی پخته|Fettuccine, cooked|164|5.7|33.6|0.8|
ماکارونی تخم‌مرغی خشک|Egg noodles, dry|380|14|71|4.4|
ماکارونی تخم‌مرغی پخته|Egg noodles, cooked|181|6.7|33.8|2.1|
ماکارونی رامن خشک|Ramen noodles, dry|350|10|73|2|
ماکارونی رامن پخته|Ramen noodles, cooked|159|4.5|33.2|0.9|
نودل برنجی خشک|Rice noodles, dry|349|6|80|0.6|
نودل برنجی پخته|Rice noodles, cooked|117|2|26.7|0.2|
نودل اودون خشک|Udon noodles, dry|345|10|74|1|
نودل اودون پخته|Udon noodles, cooked|157|4.5|33.6|0.5|
نودل سوبا (گندم سیاه) خشک|Soba noodles, dry|345|14|70|1|
نودل سوبا (گندم سیاه) پخته|Soba noodles, cooked|150|6.1|30.4|0.4|
ورمیشل (رشته فرنگی) خشک|Vermicelli, dry|362|12.5|75|1.3|
ورمیشل (رشته فرنگی) پخته|Vermicelli, cooked|139|4.8|28.8|0.5|
رشته آش خشک|Ash noodles (reshteh), dry|358|12|74|1.5|
رشته آش پخته|Ash noodles (reshteh), cooked|149|5|30.8|0.6|
رشته پلویی (نازک) خشک|Thin noodles for rice, dry|358|12|74|1.5|
رشته پلویی (نازک) پخته|Thin noodles for rice, cooked|149|5|30.8|0.6|
رشته خوشکار خشک|Reshteh khoshkar dough, dry|237|8|40|5|
لپه ماکارونی (نودل شیشه‌ای) خشک|Glass noodles, dry|346|0.2|86|0.1|
لپه ماکارونی (نودل شیشه‌ای) پخته|Glass noodles, cooked|115|0.1|28.7|0|
ماکارونی بدون گلوتن (برنج) خشک|Gluten-free pasta, dry|358|7|79|1.5|
ماکارونی بدون گلوتن (برنج) پخته|Gluten-free pasta, cooked|156|3|34.3|0.7|
ماکارونی نخودی خشک|Chickpea pasta, dry|378|21|60|6|
ماکارونی نخودی پخته|Chickpea pasta, cooked|164|9.1|26.1|2.6|
ماکارونی عدسی خشک|Lentil pasta, dry|363|25|60|2.5|
ماکارونی عدسی پخته|Lentil pasta, cooked|158|10.9|26.1|1.1|
ماکارونی کینوآ خشک|Quinoa pasta, dry|375|11|77|2.5|
ماکارونی کینوآ پخته|Quinoa pasta, cooked|163|4.8|33.5|1.1|
ماکارونی اسفناجی خشک|Spinach pasta, dry|358|13|72|2|
ماکارونی اسفناجی پخته|Spinach pasta, cooked|163|5.9|32.7|0.9|
ماکارونی خانگی تازه خشک|Fresh pasta, dry|287|11|55|2.5|
ماکارونی خانگی تازه پخته|Fresh pasta, cooked|239|9.2|45.8|2.1|
پاستا ریگاتونی خشک|Rigatoni, dry|362|13|74|1.5|
پاستا ریگاتونی پخته|Rigatoni, cooked|164|5.9|33.6|0.7|
پاستا ترتلینی (پر نشده) خشک|Tortellini (plain), dry|342|11|70|2|
پاستا ترتلینی (پر نشده) پخته|Tortellini (plain), cooked|155|5|31.8|0.9|
پاستا اورزو خشک|Orzo, dry|362|13|74|1.5|
پاستا اورزو پخته|Orzo, cooked|164|5.9|33.6|0.7|
پاستا ماکارونی صدفی خشک|Shell pasta, dry|362|13|74|1.5|
پاستا ماکارونی صدفی پخته|Shell pasta, cooked|164|5.9|33.6|0.7|
ماکارونی پرک‌شده (ریز) خشک|Small soup pasta, dry|362|13|74|1.5|
ماکارونی پرک‌شده (ریز) پخته|Small soup pasta, cooked|158|5.7|32.2|0.7|
آرد گندم سفید|White wheat flour|355|10.3|76.3|1|
آرد گندم کامل|Whole wheat flour|360|13.7|72|1.9|
آرد نان (سنگک)|Bread flour|353|12|73|1.4|
آرد سفید نول|Plain flour (nul)|355|10.3|76.3|1|
آرد سبوس‌دار|Bran flour|347|14|66|3|
آرد برنج قهوه‌ای|Brown rice flour|358|7.2|76|2.8|
آرد نشاسته ذرت (کورن‌استارچ)|Cornstarch|366|0.3|91|0.1|
آرد عدس|Lentil flour|354|25|60|1.5|
آرد جو دوسر|Oat flour|377|14.7|65|6.5|
آرد چاودار|Rye flour|365|10.9|76|1.9|
آرد اسپلت|Spelt flour|360|14.6|70|2.4|
آرد گندم سیاه|Buckwheat flour|370|13.3|71.5|3.4|
آرد کینوآ|Quinoa flour|353|13|64|5|
آرد ارزن|Millet flour|374|11|73|4.2|
آرد سورگوم|Sorghum flour|373|8.4|77|3.5|
آرد آمارانت|Amaranth flour|377|13.6|65|7|
آرد فندق|Hazelnut flour|646|14|17|58|
آرد گردو|Walnut flour|674|15|14|62|
آرد سیب‌زمینی|Potato flour|362|6.9|83|0.3|
آرد تاپیوکا|Tapioca flour|356|0.2|88.7|0|
آرد کاساوا|Cassava flour|363|1.5|88|0.5|
آرد موز سبز|Green banana flour|359|3.5|85|0.5|
آرد سمولینا|Semolina flour|352|12.7|72.8|1.1|
آرد خرما (پودر خرما)|Date powder|324|2|78|0.4|
آرد کنجد|Sesame flour|472|40|15|28|
آرد شاهدانه|Hemp flour|374|33|38|10|
آرد دانه کتان|Flax meal|566|18|29|42|
آرد بنشن|Pea flour|346|22|60|2|
آرد لوبیا سفید|White bean flour|346|22|61|1.5|
آرد باقلا|Fava flour|350|26|58|1.5|
آرد ماش|Mung bean flour|359|24|63|1.2|
آرد گندم بدون گلوتن (مخلوط)|Gluten-free flour mix|354|5|80|1.5|
نشاسته سیب‌زمینی|Potato starch|333|0.1|83|0.1|
گلوتن گندم|Vital wheat gluten|373|75|14|1.9|
کورن‌فلکس ساده|Corn flakes|370|7.5|84|0.4|
کورن‌فلکس شکلاتی|Chocolate corn flakes|387|6|84|3|
غلات صبحانه پفی برنج|Rice crisps cereal|381|6|87|1|
غلات صبحانه سبوس‌دار (برن فلکس)|Bran flakes|362|10|76|2|
گرانولا ساده|Plain granola|422|10|64|14|
گرانولا با عسل و آجیل|Honey nut granola|429|9|60|17|
گرانولا کم‌چرب|Low-fat granola|381|8|76|5|
موسلی ساده|Muesli|358|10|66|6|
موسلی با میوه خشک|Muesli with dried fruit|360|9.5|68|5.5|
موسلی بدون شکر|Unsweetened muesli|364|11|62|8|
غلات صبحانه گندم پفی|Puffed wheat cereal|373|13|77|1.4|
غلات صبحانه ذرت پفی|Puffed corn cereal|370|6|82|2|
غلات صبحانه کریسپ شکلاتی|Chocolate crisp cereal|392|6|83|4|
غلات صبحانه حلقه‌ای میوه‌ای|Fruit rings cereal|391|5|86|3|
غلات صبحانه پرک جو دوسر عسلی|Honey oat cereal|386|8|75|6|
غلات صبحانه شیرین‌شده کودک|Kids sweetened cereal|387|5|85|3|
غلات صبحانه پروتئینی|Protein cereal|345|20|55|5|
نان خشک خرد شده (پودر نان)|Breadcrumbs|367|13|72|3|
پودر سوخاری پانکو|Panko breadcrumbs|366|11|77|1.5|
فرنی جو دوسر ساده|Oat porridge|72|2.5|12|1.5|
فرنی جو دوسر با شیر|Oatmeal with milk|85|3.5|12|2.5|
فرنی جو دوسر با آب|Oatmeal with water|72|2.5|12|1.5|
فرنی جو دوسر با شیر و عسل|Oatmeal with milk and honey|109|3.5|18|2.5|
پودینگ جو دوسر شبانه|Overnight oats|128|5|18|4|
فرنی گندم (حلیم ساده)|Plain halim|103|6|13|3|
پرک گندم|Wheat flakes|350|11|72|2|
پرک ذرت|Corn flakes (plain flaked corn)|365|7|83|0.5|
پرک جو|Barley flakes|350|11|72|2|
پرک ارزن|Millet flakes|372|11|73|4|
پرک کینوآ|Quinoa flakes|362|13|64|6|
پرک برنج|Rice flakes|357|6.6|80|1.2|
پرک چاودار|Rye flakes|351|10|74|1.7|
سبوس برنج|Rice bran|441|13.4|49.7|20.9|
پاپ‌کورن با هوای گرم|Air-popped popcorn|403|12.9|77.8|4.5|
نان تست خشک پودر شده|Dried toast crumbs|375|12|75|3|
`;
const ING_LEGNUT = `
نخود خشک|Chickpeas, dry|380|20.5|61|6|نخود
نخود پخته (آب‌پز)|Chickpeas, boiled|165|8.9|26.5|2.6|نخود
نخود کنسروی (آماده)|Chickpeas, canned|148|7.8|23.7|2.4|
نخود کابلی خشک|Kabuli chickpeas, dry|374|19.3|60.6|6|
نخود کابلی پخته (آب‌پز)|Kabuli chickpeas, boiled|162|8.4|26.3|2.6|
نخود کابلی کنسروی (آماده)|Kabuli chickpeas, canned|145|7.3|23.5|2.4|
نخود دسی (سیاه) خشک|Desi chickpeas, dry|380|20.5|61|6|
نخود دسی (سیاه) پخته (آب‌پز)|Desi chickpeas, boiled|165|8.9|26.5|2.6|
نخود دسی (سیاه) کنسروی (آماده)|Desi chickpeas, canned|148|7.8|23.7|2.4|
عدس قهوه‌ای خشک|Brown lentils, dry|353|25.8|60|1.1|عدس
عدس قهوه‌ای پخته (آب‌پز)|Brown lentils, boiled|122|8.9|20.7|0.4|عدس
عدس قهوه‌ای کنسروی (آماده)|Brown lentils, canned|111|7.9|18.9|0.4|
عدس قرمز خشک|Red lentils, dry|362|24.6|63.4|1.1|
عدس قرمز پخته (آب‌پز)|Red lentils, boiled|129|8.8|22.6|0.4|
عدس قرمز کنسروی (آماده)|Red lentils, canned|117|7.8|20.6|0.4|
عدس سبز خشک|Green lentils, dry|350|25|60|1.1|
عدس سبز پخته (آب‌پز)|Green lentils, boiled|121|8.6|20.7|0.4|
عدس سبز کنسروی (آماده)|Green lentils, canned|110|7.7|18.9|0.4|
عدس سیاه (بلوگا) خشک|Black beluga lentils, dry|350|25|60|1.1|
عدس سیاه (بلوگا) پخته (آب‌پز)|Black beluga lentils, boiled|121|8.6|20.7|0.4|
عدس سیاه (بلوگا) کنسروی (آماده)|Black beluga lentils, canned|110|7.7|18.9|0.4|
عدس زرد خشک|Yellow lentils, dry|352|24.5|60|1.5|
عدس زرد پخته (آب‌پز)|Yellow lentils, boiled|125|8.8|21.4|0.5|
عدس زرد کنسروی (آماده)|Yellow lentils, canned|114|7.8|19.5|0.5|
لپه خشک|Split chickpeas (lappeh), dry|376|22|60|5.3|لپه
لپه پخته (آب‌پز)|Split chickpeas (lappeh), boiled|144|8.5|23.1|2|لپه
لپه کنسروی (آماده)|Split chickpeas (lappeh), canned|131|7.5|20.9|1.9|
لوبیا چیتی خشک|Pinto beans, dry|347|21.4|62.6|1.2|لوبیا
لوبیا چیتی پخته (آب‌پز)|Pinto beans, boiled|139|8.6|25|0.5|لوبیا
لوبیا چیتی کنسروی (آماده)|Pinto beans, canned|124|7.5|22.5|0.4|
لوبیا قرمز خشک|Red kidney beans, dry|344|22.5|61|1.1|
لوبیا قرمز پخته (آب‌پز)|Red kidney beans, boiled|137|9|24.4|0.4|
لوبیا قرمز کنسروی (آماده)|Red kidney beans, canned|123|7.9|22|0.4|
لوبیا سفید خشک|White beans, dry|342|23.4|60.3|0.8|
لوبیا سفید پخته (آب‌پز)|White beans, boiled|132|9|23.2|0.3|
لوبیا سفید کنسروی (آماده)|White beans, canned|118|7.9|21|0.3|
لوبیا چشم‌بلبلی خشک|Black-eyed peas, dry|353|23.5|60|2.1|
لوبیا چشم‌بلبلی پخته (آب‌پز)|Black-eyed peas, boiled|141|9.4|24|0.8|
لوبیا چشم‌بلبلی کنسروی (آماده)|Black-eyed peas, canned|127|8.3|21.6|0.8|
لوبیا سیاه خشک|Black beans, dry|351|21.6|63|1.4|
لوبیا سیاه پخته (آب‌پز)|Black beans, boiled|141|8.6|25.2|0.6|
لوبیا سیاه کنسروی (آماده)|Black beans, canned|126|7.6|22.7|0.5|
لوبیا نیوی (سفید ریز) خشک|Navy beans, dry|346|22.3|60.8|1.5|
لوبیا نیوی (سفید ریز) پخته (آب‌پز)|Navy beans, boiled|138|8.9|24.3|0.6|
لوبیا نیوی (سفید ریز) کنسروی (آماده)|Navy beans, canned|124|7.8|21.9|0.6|
لوبیا لیما خشک|Lima beans, dry|346|21.5|63.4|0.7|
لوبیا لیما پخته (آب‌پز)|Lima beans, boiled|134|8.3|24.4|0.3|
لوبیا لیما کنسروی (آماده)|Lima beans, canned|119|7.3|22|0.2|
لوبیا گرگری (کانلینی) خشک|Cannellini beans, dry|341|23|60|1|
لوبیا گرگری (کانلینی) پخته (آب‌پز)|Cannellini beans, boiled|131|8.8|23.1|0.4|
لوبیا گرگری (کانلینی) کنسروی (آماده)|Cannellini beans, canned|118|7.8|20.9|0.4|
لوبیا قرمز شیرین (آدزوکی) خشک|Adzuki beans, dry|337|20.3|62.9|0.5|
لوبیا قرمز شیرین (آدزوکی) پخته (آب‌پز)|Adzuki beans, boiled|141|8.5|26.2|0.2|
لوبیا قرمز شیرین (آدزوکی) کنسروی (آماده)|Adzuki beans, canned|125|7.4|23.5|0.2|
لوبیا ماش خشک|Mung beans, dry|357|23.9|62.6|1.2|ماش
لوبیا ماش پخته (آب‌پز)|Mung beans, boiled|132|8.9|23.2|0.4|ماش
لوبیا ماش کنسروی (آماده)|Mung beans, canned|119|7.8|21|0.4|
لوبیا ماش سبز خشک|Green mung beans, dry|357|23.9|62.6|1.2|
لوبیا ماش سبز پخته (آب‌پز)|Green mung beans, boiled|132|8.9|23.2|0.4|
لوبیا ماش سبز کنسروی (آماده)|Green mung beans, canned|119|7.8|21|0.4|
ماش پوست‌کنده خشک|Peeled mung beans, dry|359|24|63|1.2|
ماش پوست‌کنده پخته (آب‌پز)|Peeled mung beans, boiled|132|8.9|23.3|0.4|
ماش پوست‌کنده کنسروی (آماده)|Peeled mung beans, canned|120|7.9|21.1|0.4|
باقالی خشک خشک|Dried fava beans, dry|350|26|58|1.5|باقلا خشک
باقالی خشک پخته (آب‌پز)|Dried fava beans, boiled|140|10.4|23.2|0.6|باقلا خشک
باقالی خشک کنسروی (آماده)|Dried fava beans, canned|125|9.1|20.9|0.6|
باقالی پوست‌کنده خشک|Peeled fava beans, dry|350|26|58|1.5|
باقالی پوست‌کنده پخته (آب‌پز)|Peeled fava beans, boiled|140|10.4|23.2|0.6|
باقالی پوست‌کنده کنسروی (آماده)|Peeled fava beans, canned|125|9.1|20.9|0.6|
نخود فرنگی خشک خشک|Dried green peas, dry|349|24.6|60|1.2|
نخود فرنگی خشک پخته (آب‌پز)|Dried green peas, boiled|135|9.5|23.1|0.5|
نخود فرنگی خشک کنسروی (آماده)|Dried green peas, canned|120|8.3|20.9|0.4|
نخود شکسته (اسپلیت پی) خشک|Split peas, dry|351|24.6|60.4|1.2|
نخود شکسته (اسپلیت پی) پخته (آب‌پز)|Split peas, boiled|130|9.1|22.4|0.4|
نخود شکسته (اسپلیت پی) کنسروی (آماده)|Split peas, canned|117|8.1|20.3|0.4|
لوبیا قرمز مرکب خشک|Dark red kidney beans, dry|344|22.5|61|1.1|
لوبیا قرمز مرکب پخته (آب‌پز)|Dark red kidney beans, boiled|137|9|24.4|0.4|
لوبیا قرمز مرکب کنسروی (آماده)|Dark red kidney beans, canned|123|7.9|22|0.4|
لوبیا پینتو سبز (لوبیا پلویی) خشک|Cranberry beans, dry|343|23|60|1.2|
لوبیا پینتو سبز (لوبیا پلویی) پخته (آب‌پز)|Cranberry beans, boiled|137|9.2|24|0.5|
لوبیا پینتو سبز (لوبیا پلویی) کنسروی (آماده)|Cranberry beans, canned|122|8.1|21.6|0.4|
لوبیا قرمز ریز (قرمز کوچک) خشک|Small red beans, dry|345|22|61.5|1.2|
لوبیا قرمز ریز (قرمز کوچک) پخته (آب‌پز)|Small red beans, boiled|138|8.8|24.6|0.5|
لوبیا قرمز ریز (قرمز کوچک) کنسروی (آماده)|Small red beans, canned|123|7.7|22.1|0.4|
لوبیا گریت ناردرن خشک|Great northern beans, dry|346|21.9|62|1.2|
لوبیا گریت ناردرن پخته (آب‌پز)|Great northern beans, boiled|139|8.8|24.8|0.5|
لوبیا گریت ناردرن کنسروی (آماده)|Great northern beans, canned|124|7.7|22.3|0.4|
سویا خشک خشک|Dry soybeans, dry|446|36.5|30.2|19.9|لوبیا سویا
سویا خشک پخته (آب‌پز)|Dry soybeans, boiled|179|14.6|12.1|8|لوبیا سویا
سویا خشک کنسروی (آماده)|Dry soybeans, canned|162|12.8|11.1|7.4|
سویای سیاه خشک|Black soybeans, dry|444|36|30|20|
سویای سیاه پخته (آب‌پز)|Black soybeans, boiled|178|14.4|12|8|
سویای سیاه کنسروی (آماده)|Black soybeans, canned|162|12.7|11.1|7.4|
ترمس خشک خشک|Dried lupini beans, dry|394|36.2|40.4|9.7|
ترمس خشک پخته (آب‌پز)|Dried lupini beans, boiled|151|13.9|15.5|3.7|
ترمس خشک کنسروی (آماده)|Dried lupini beans, canned|138|12.3|14.2|3.5|
ترمس پخته آب‌نمک خشک|Brined lupini beans, dry|131|16|10|3|
ماش دانه ریز خشک|Small mung, dry|359|24|63|1.2|
ماش دانه ریز پخته (آب‌پز)|Small mung, boiled|132|8.9|23.3|0.4|
ماش دانه ریز کنسروی (آماده)|Small mung, canned|120|7.9|21.1|0.4|
نخود سبز خشک خشک|Dry green chickpeas, dry|378|20|61|6|
نخود سبز خشک پخته (آب‌پز)|Dry green chickpeas, boiled|164|8.7|26.5|2.6|
نخود سبز خشک کنسروی (آماده)|Dry green chickpeas, canned|147|7.6|23.7|2.4|
دال عدس خشک|Masoor dal, dry|350|25|60|1.1|دال
دال عدس پخته (آب‌پز)|Masoor dal, boiled|125|8.9|21.4|0.4|دال
دال عدس کنسروی (آماده)|Masoor dal, canned|113|7.9|19.5|0.4|
دال نخود (چنا دال) خشک|Chana dal, dry|376|20.5|61|5.5|
دال نخود (چنا دال) پخته (آب‌پز)|Chana dal, boiled|145|7.9|23.5|2.1|
دال نخود (چنا دال) کنسروی (آماده)|Chana dal, canned|131|7|21.2|2|
دال اورد (اورد دال) خشک|Urad dal, dry|346|25|58|1.6|
دال اورد (اورد دال) پخته (آب‌پز)|Urad dal, boiled|129|9.3|21.5|0.6|
دال اورد (اورد دال) کنسروی (آماده)|Urad dal, canned|116|8.2|19.5|0.6|
دال توار (کبوتری) خشک|Toor dal, dry|354|22|63|1.5|
دال توار (کبوتری) پخته (آب‌پز)|Toor dal, boiled|131|8.1|23.3|0.6|
دال توار (کبوتری) کنسروی (آماده)|Toor dal, canned|118|7.2|21.1|0.5|
بادام درختی خام|Almonds, raw|620|21.2|21.6|49.9|
بادام درختی برشته (بدون نمک)|Almonds, dry roasted|634|21.8|22.2|50.9|
بادام درختی برشته نمکی|Almonds, roasted and salted|633|21.8|22|50.9|
بادام درختی برشته در روغن|Almonds, oil roasted|631|20.8|21.2|51.4|
بادام شیرین خام|Sweet almonds, raw|620|21.2|21.6|49.9|
بادام شیرین برشته (بدون نمک)|Sweet almonds, dry roasted|634|21.8|22.2|50.9|
بادام شیرین برشته نمکی|Sweet almonds, roasted and salted|633|21.8|22|50.9|
بادام شیرین برشته در روغن|Sweet almonds, oil roasted|631|20.8|21.2|51.4|
بادام تلخ خام|Bitter almonds, raw|622|21|22|50|
بادام تلخ برشته (بدون نمک)|Bitter almonds, dry roasted|636|21.6|22.7|51|
بادام تلخ برشته نمکی|Bitter almonds, roasted and salted|635|21.6|22.4|51|
بادام تلخ برشته در روغن|Bitter almonds, oil roasted|632|20.6|21.6|51.5|
بادام زمینی برشته (بدون نمک)|Peanuts, dry roasted|625|26.6|16.6|50.2|
بادام زمینی برشته در روغن|Peanuts, oil roasted|621|25.3|15.8|50.7|
پسته برشته (بدون نمک)|Pistachios, dry roasted|612|20.8|28.3|46.2|
پسته برشته نمکی|Pistachios, roasted and salted|611|20.8|28.1|46.2|
پسته برشته در روغن|Pistachios, oil roasted|607|19.8|26.9|46.7|
پسته اکبری خام|Akbari pistachios, raw|593|20|27|45|
پسته اکبری برشته (بدون نمک)|Akbari pistachios, dry roasted|607|20.6|27.8|45.9|
پسته اکبری برشته نمکی|Akbari pistachios, roasted and salted|606|20.6|27.5|45.9|
پسته اکبری برشته در روغن|Akbari pistachios, oil roasted|602|19.6|26.5|46.4|
پسته احمدآقایی خام|Ahmad-Aghaei pistachios, raw|593|20|27|45|
پسته احمدآقایی برشته (بدون نمک)|Ahmad-Aghaei pistachios, dry roasted|607|20.6|27.8|45.9|
پسته احمدآقایی برشته نمکی|Ahmad-Aghaei pistachios, roasted and salted|606|20.6|27.5|45.9|
پسته احمدآقایی برشته در روغن|Ahmad-Aghaei pistachios, oil roasted|602|19.6|26.5|46.4|
پسته فندقی خام|Fandoghi pistachios, raw|593|20|27|45|
پسته فندقی برشته (بدون نمک)|Fandoghi pistachios, dry roasted|607|20.6|27.8|45.9|
پسته فندقی برشته نمکی|Fandoghi pistachios, roasted and salted|606|20.6|27.5|45.9|
پسته فندقی برشته در روغن|Fandoghi pistachios, oil roasted|602|19.6|26.5|46.4|
پسته کله‌قوچی خام|Kalleh-Ghoochi pistachios, raw|593|20|27|45|
پسته کله‌قوچی برشته (بدون نمک)|Kalleh-Ghoochi pistachios, dry roasted|607|20.6|27.8|45.9|
پسته کله‌قوچی برشته نمکی|Kalleh-Ghoochi pistachios, roasted and salted|606|20.6|27.5|45.9|
پسته کله‌قوچی برشته در روغن|Kalleh-Ghoochi pistachios, oil roasted|602|19.6|26.5|46.4|
پسته سبز (پسته خام) خام|Green pistachios, raw|593|20|27|45|
پسته سبز (پسته خام) برشته (بدون نمک)|Green pistachios, dry roasted|607|20.6|27.8|45.9|
پسته سبز (پسته خام) برشته نمکی|Green pistachios, roasted and salted|606|20.6|27.5|45.9|
پسته سبز (پسته خام) برشته در روغن|Green pistachios, oil roasted|602|19.6|26.5|46.4|
پسته بی‌پوست خام|Peeled pistachios, raw|593|20|27|45|
پسته بی‌پوست برشته (بدون نمک)|Peeled pistachios, dry roasted|607|20.6|27.8|45.9|
پسته بی‌پوست برشته نمکی|Peeled pistachios, roasted and salted|606|20.6|27.5|45.9|
پسته بی‌پوست برشته در روغن|Peeled pistachios, oil roasted|602|19.6|26.5|46.4|
فندق برشته (بدون نمک)|Hazelnuts, dry roasted|689|15.5|17.2|62|
فندق برشته نمکی|Hazelnuts, roasted and salted|688|15.5|17|62|
فندق برشته در روغن|Hazelnuts, oil roasted|688|14.7|16.4|62.6|
گردو خام|Walnuts, raw|702|15.2|13.7|65.2|
گردو برشته (بدون نمک)|Walnuts, dry roasted|718|15.7|14.1|66.5|
گردو برشته نمکی|Walnuts, roasted and salted|717|15.7|14|66.5|
گردو برشته در روغن|Walnuts, oil roasted|718|14.9|13.4|67.2|
گردو بدون پوست خام|Peeled walnuts, raw|701|15|14|65|
گردو بدون پوست برشته (بدون نمک)|Peeled walnuts, dry roasted|716|15.5|14.4|66.3|
گردو بدون پوست برشته نمکی|Peeled walnuts, roasted and salted|716|15.5|14.3|66.3|
گردو بدون پوست برشته در روغن|Peeled walnuts, oil roasted|717|14.7|13.7|67|
مغز گردو سفید خام|White walnut kernels, raw|701|15|14|65|
مغز گردو سفید برشته (بدون نمک)|White walnut kernels, dry roasted|716|15.5|14.4|66.3|
مغز گردو سفید برشته نمکی|White walnut kernels, roasted and salted|716|15.5|14.3|66.3|
مغز گردو سفید برشته در روغن|White walnut kernels, oil roasted|717|14.7|13.7|67|
مغز گردو نیمه خام|Walnut halves, raw|702|15.2|13.7|65.2|
مغز گردو نیمه برشته (بدون نمک)|Walnut halves, dry roasted|718|15.7|14.1|66.5|
مغز گردو نیمه برشته نمکی|Walnut halves, roasted and salted|717|15.7|14|66.5|
مغز گردو نیمه برشته در روغن|Walnut halves, oil roasted|718|14.9|13.4|67.2|
بادام هندی (کاجو) خام|Cashews, raw|589|18.2|30.2|43.9|کاجو
بادام هندی (کاجو) برشته (بدون نمک)|Cashews, dry roasted|602|18.7|31.1|44.8|
بادام هندی (کاجو) برشته نمکی|Cashews, roasted and salted|601|18.7|30.8|44.8|
بادام هندی (کاجو) برشته در روغن|Cashews, oil roasted|596|17.8|29.6|45.2|
پکان خام|Pecans, raw|740|9.2|13.9|72|
پکان برشته (بدون نمک)|Pecans, dry roasted|756|9.5|14.3|73.4|
پکان برشته نمکی|Pecans, roasted and salted|755|9.5|14.2|73.4|
پکان برشته در روغن|Pecans, oil roasted|758|9|13.6|74.2|
مغز برزیلی خام|Brazil nuts, raw|702|14.3|11.7|66.4|
مغز برزیلی برشته (بدون نمک)|Brazil nuts, dry roasted|717|14.7|12.1|67.7|
مغز برزیلی برشته نمکی|Brazil nuts, roasted and salted|716|14.7|11.9|67.7|
مغز برزیلی برشته در روغن|Brazil nuts, oil roasted|718|14|11.5|68.4|
ماکادمیا خام|Macadamia nuts, raw|769|7.9|13.8|75.8|
ماکادمیا برشته (بدون نمک)|Macadamia nuts, dry roasted|785|8.1|14.2|77.3|
ماکادمیا برشته نمکی|Macadamia nuts, roasted and salted|784|8.1|14.1|77.3|
ماکادمیا برشته در روغن|Macadamia nuts, oil roasted|788|7.7|13.5|78.1|
کاج (پینه‌نات) خام|Pine nuts, raw|723|13.7|13.1|68.4|مغز کاج
کاج (پینه‌نات) برشته (بدون نمک)|Pine nuts, dry roasted|739|14.1|13.5|69.8|
کاج (پینه‌نات) برشته نمکی|Pine nuts, roasted and salted|738|14.1|13.4|69.8|
کاج (پینه‌نات) برشته در روغن|Pine nuts, oil roasted|739|13.4|12.8|70.5|
چهارمغز خام|Mixed four nuts, raw|639|16|20|55|
چهارمغز برشته (بدون نمک)|Mixed four nuts, dry roasted|653|16.5|20.6|56.1|
چهارمغز برشته نمکی|Mixed four nuts, roasted and salted|653|16.5|20.4|56.1|
چهارمغز برشته در روغن|Mixed four nuts, oil roasted|651|15.7|19.6|56.6|
مغز تخمه کدو (تخم کدو پوست‌کنده) خام|Pumpkin seeds, hulled, raw|605|30.2|10.7|49|
مغز تخمه کدو (تخم کدو پوست‌کنده) برشته (بدون نمک)|Pumpkin seeds, hulled, dry roasted|618|31.1|11|50|
مغز تخمه کدو (تخم کدو پوست‌کنده) برشته نمکی|Pumpkin seeds, hulled, roasted and salted|618|31.1|10.9|50|
مغز تخمه کدو (تخم کدو پوست‌کنده) برشته در روغن|Pumpkin seeds, hulled, oil roasted|615|29.6|10.5|50.5|
تخمه آفتابگردان پوست‌کنده خام|Sunflower seed kernels, raw|627|20.8|20|51.5|
تخمه آفتابگردان پوست‌کنده برشته (بدون نمک)|Sunflower seed kernels, dry roasted|641|21.4|20.6|52.5|
تخمه آفتابگردان پوست‌کنده برشته نمکی|Sunflower seed kernels, roasted and salted|640|21.4|20.4|52.5|
تخمه آفتابگردان پوست‌کنده برشته در روغن|Sunflower seed kernels, oil roasted|637|20.4|19.6|53|
تخمه آفتابگردان با پوست خام|Sunflower seeds in shell, raw|366|12|12|30|
تخمه آفتابگردان با پوست برشته (بدون نمک)|Sunflower seeds in shell, dry roasted|375|12.4|12.4|30.6|
تخمه آفتابگردان با پوست برشته نمکی|Sunflower seeds in shell, roasted and salted|374|12.4|12.2|30.6|
تخمه آفتابگردان با پوست برشته در روغن|Sunflower seeds in shell, oil roasted|373|11.8|11.8|30.9|
تخمه هندوانه پوست‌کنده خام|Watermelon seed kernels, raw|600|28|15.3|47.4|
تخمه هندوانه پوست‌کنده برشته (بدون نمک)|Watermelon seed kernels, dry roasted|613|28.8|15.8|48.3|
تخمه هندوانه پوست‌کنده برشته نمکی|Watermelon seed kernels, roasted and salted|612|28.8|15.6|48.3|
تخمه هندوانه پوست‌کنده برشته در روغن|Watermelon seed kernels, oil roasted|609|27.4|15|48.8|
تخمه هندوانه با پوست خام|Watermelon seeds in shell, raw|356|17|9|28|
تخمه هندوانه با پوست برشته (بدون نمک)|Watermelon seeds in shell, dry roasted|365|17.5|9.3|28.6|
تخمه هندوانه با پوست برشته نمکی|Watermelon seeds in shell, roasted and salted|364|17.5|9.2|28.6|
تخمه هندوانه با پوست برشته در روغن|Watermelon seeds in shell, oil roasted|361|16.7|8.8|28.8|
تخمه کدو با پوست خام|Pumpkin seeds in shell, raw|463|19|54|19|
تخمه کدو با پوست برشته (بدون نمک)|Pumpkin seeds in shell, dry roasted|475|19.6|55.6|19.4|
تخمه کدو با پوست برشته نمکی|Pumpkin seeds in shell, roasted and salted|473|19.6|55.1|19.4|
تخمه کدو با پوست برشته در روغن|Pumpkin seeds in shell, oil roasted|462|18.6|52.9|19.6|
تخمه خربزه خام|Melon seeds, raw|595|28|15|47|
تخمه خربزه برشته (بدون نمک)|Melon seeds, dry roasted|608|28.8|15.5|47.9|
تخمه خربزه برشته نمکی|Melon seeds, roasted and salted|608|28.8|15.3|47.9|
تخمه خربزه برشته در روغن|Melon seeds, oil roasted|604|27.4|14.7|48.4|
تخمه خیار خام|Cucumber seeds, raw|565|25|15|45|
تخمه خیار برشته (بدون نمک)|Cucumber seeds, dry roasted|578|25.8|15.5|45.9|
تخمه خیار برشته نمکی|Cucumber seeds, roasted and salted|578|25.8|15.3|45.9|
تخمه خیار برشته در روغن|Cucumber seeds, oil roasted|574|24.5|14.7|46.4|
تخم کتان خام|Flax seeds, raw|569|18.3|28.9|42.2|
تخم چیا خام|Chia seeds, raw|511|16.5|42.1|30.7|
تخم کنجد خام|Sesame seeds, raw|612|17.7|23.5|49.7|
تخم کنجد برشته (بدون نمک)|Sesame seeds, dry roasted|626|18.2|24.2|50.7|
تخم کنجد برشته نمکی|Sesame seeds, roasted and salted|625|18.2|24|50.7|
تخم کنجد برشته در روغن|Sesame seeds, oil roasted|622|17.3|23|51.2|
تخم کنجد پوست‌کنده خام|Hulled sesame seeds, raw|649|18|25|53|
تخم کنجد پوست‌کنده برشته (بدون نمک)|Hulled sesame seeds, dry roasted|664|18.5|25.8|54.1|
تخم کنجد پوست‌کنده برشته نمکی|Hulled sesame seeds, roasted and salted|663|18.5|25.5|54.1|
تخم کنجد پوست‌کنده برشته در روغن|Hulled sesame seeds, oil roasted|660|17.6|24.5|54.6|
تخم کنجد سیاه خام|Black sesame seeds, raw|614|18|23|50|
تخم کنجد سیاه برشته (بدون نمک)|Black sesame seeds, dry roasted|628|18.5|23.7|51|
تخم کنجد سیاه برشته نمکی|Black sesame seeds, roasted and salted|627|18.5|23.5|51|
تخم کنجد سیاه برشته در روغن|Black sesame seeds, oil roasted|624|17.6|22.5|51.5|
تخم شاهدانه (بذر کنف) خام|Hemp seeds, raw|600|31.6|8.7|48.8|
تخم خشخاش خام|Poppy seeds, raw|562|18|28|42|
تخم ریحان (تخم شربتی) خام|Basil seeds, raw|340|14|62|4|
تخم خرفه خام|Purslane seeds, raw|398|15|35|22|
تخم بالنگو خام|Dragon's head seeds, raw|425|20|30|25|
تخم گشنیز خام|Coriander seeds, raw|429|12.4|54.9|17.8|
تخم سیاه‌دانه خام|Black cumin seeds, raw|442|17|44|22|
تخم شنبلیله خام|Fenugreek seeds, raw|382|23|58|6.4|
تخم رازیانه خام|Fennel seeds, raw|407|15.8|52.3|14.9|
تخم زیره خام|Cumin seeds, raw|449|17.8|44.2|22.3|
تخم شوید خام|Dill seeds, raw|415|16|55|14.5|
تخم کرفس خام|Celery seeds, raw|466|18.1|41.4|25.3|
تخم انیسون خام|Anise seeds, raw|416|18|50|16|
تخم خردل خام|Mustard seeds, raw|543|26.1|28.1|36.2|
تخم شلغم خام|Turnip seeds, raw|508|24|40|28|
دانه آمارانت پف‌کرده خام|Puffed amaranth, raw|375|13|65|7|
تخم کاسنی خام|Chicory seeds, raw|395|15|50|15|
تخم قدومه خام|Qodume seeds, raw|420|20|40|20|
تخم اسفرزه خام|Psyllium seeds, raw|363|2.5|86|1|
تخم شاهی خام|Garden cress seeds, raw|444|24|33|24|
تخم بارهنگ خام|Plantago seeds, raw|292|15|40|8|
دانه انار خشک (آناردانه) خام|Dried pomegranate seeds (anardaneh), raw|316|5|65|4|
مغز هسته زردآلو خام|Apricot kernels, raw|617|25|28|45|
مغز هسته زردآلو برشته (بدون نمک)|Apricot kernels, dry roasted|632|25.8|28.8|45.9|
مغز هسته زردآلو برشته نمکی|Apricot kernels, roasted and salted|631|25.8|28.6|45.9|
مغز هسته زردآلو برشته در روغن|Apricot kernels, oil roasted|625|24.5|27.4|46.4|
مغز هسته هلو خام|Peach kernels, raw|617|25|28|45|
مغز هسته هلو برشته (بدون نمک)|Peach kernels, dry roasted|632|25.8|28.8|45.9|
مغز هسته هلو برشته نمکی|Peach kernels, roasted and salted|631|25.8|28.6|45.9|
مغز هسته هلو برشته در روغن|Peach kernels, oil roasted|625|24.5|27.4|46.4|
مغز هسته انگور خام|Grape seed kernels, raw|425|10|40|25|
مغز هسته انگور برشته (بدون نمک)|Grape seed kernels, dry roasted|436|10.3|41.2|25.5|
مغز هسته انگور برشته نمکی|Grape seed kernels, roasted and salted|434|10.3|40.8|25.5|
مغز هسته انگور برشته در روغن|Grape seed kernels, oil roasted|428|9.8|39.2|25.8|
بلوط خام خام|Raw chestnuts, raw|195|2|44|1.2|
شاه‌بلوط پخته خام|Roasted chestnuts, raw|237|3.2|53|1.4|
شاه‌بلوط خام خام|Raw sweet chestnuts, raw|195|2|44|1.2|
نارگیل خشک رنده‌شده خام|Desiccated coconut, raw|709|6.9|24|65|
نارگیل خشک شیرین‌شده رنده‌شده خام|Sweetened shredded coconut, raw|501|3.9|47|33|
تکه نارگیل (چیپس نارگیل) خام|Coconut chips, raw|672|5|28|60|
بادام زمینی بی‌پوست خام|Peeled peanuts, raw|610|25.8|16.1|49.2|
بادام زمینی بی‌پوست برشته (بدون نمک)|Peeled peanuts, dry roasted|625|26.6|16.6|50.2|
بادام زمینی بی‌پوست برشته نمکی|Peeled peanuts, roasted and salted|624|26.6|16.4|50.2|
بادام زمینی بی‌پوست برشته در روغن|Peeled peanuts, oil roasted|621|25.3|15.8|50.7|
بادام هندی خام خام|Raw cashews, raw|589|18.2|30.2|43.9|
بادام هندی خام برشته (بدون نمک)|Raw cashews, dry roasted|602|18.7|31.1|44.8|
بادام هندی خام برشته نمکی|Raw cashews, roasted and salted|601|18.7|30.8|44.8|
بادام هندی خام برشته در روغن|Raw cashews, oil roasted|596|17.8|29.6|45.2|
`;
const ING_MISC = `
روغن زیتون فرابکر|Extra virgin olive oil|884|0|0|100|
روغن زیتون معمولی|Olive oil, refined|884|0|0|100|
روغن زیتون ممتاز (ورجین)|Virgin olive oil|884|0|0|100|
روغن کنجد برشته|Toasted sesame oil|884|0|0|100|
روغن آفتابگردان پرالئیک|High-oleic sunflower oil|884|0|0|100|
روغن کلزا (کانولا)|Canola oil|884|0|0|100|
روغن پنبه‌دانه|Cottonseed oil|884|0|0|100|
روغن بادام زمینی|Peanut oil|884|0|0|100|
روغن نارگیل بکر|Virgin coconut oil|862|0|0|100|
روغن هسته پالم|Palm kernel oil|862|0|0|100|
روغن آووکادو|Avocado oil|884|0|0|100|
روغن بادام شیرین|Sweet almond oil|884|0|0|100|
روغن فندق|Hazelnut oil|884|0|0|100|
روغن دانه انگور|Grapeseed oil|884|0|0|100|
روغن کتان|Flaxseed oil|884|0|0|100|
روغن چیا|Chia oil|884|0|0|100|
روغن شاهدانه|Hemp seed oil|884|0|0|100|
روغن سیاه‌دانه|Black seed oil|884|0|0|100|
روغن کدو|Pumpkin seed oil|884|0|0|100|
روغن سبوس برنج|Rice bran oil|884|0|0|100|
روغن گلرنگ|Safflower oil|884|0|0|100|
روغن مایع آشپزی (مخلوط)|Blended vegetable oil|884|0|0|100|
روغن جامد نباتی|Hydrogenated vegetable shortening|884|0|0|100|
روغن حیوانی (کره حیوانی)|Animal ghee|876|0.3|0|99.5|روغن حیوانی
کره بدون نمک|Unsalted butter|717|0.9|0.1|81.1|
کره نمکی|Salted butter|717|0.9|0.1|81.1|
کره گیاهی (مارگارین)|Margarine|717|0.2|0.7|80.5|مارگارین
کره کاجو|Cashew butter|587|18|27|49|
کره تخمه آفتابگردان|Sunflower seed butter|617|17|24|51|
کره کنجد (ارده)|Tahini|595|17|21.2|53.8|ارده
کره کنجد (ارده) شیره‌ای|Tahini with date syrup|510|12|40|35|ارده شیره
کره کاکائو|Cocoa butter|884|0|0|100|
پیه گاو|Beef tallow|902|0|0|100|
پیه گوسفند|Mutton tallow|902|0|0|100|
دنبه گوسفند|Sheep tail fat|800|2|0|88|دنبه
چربی مرغ|Chicken fat|898|0|0|99.8|
چربی اردک|Duck fat|898|0|0|99.8|
چربی غاز|Goose fat|898|0|0|99.8|
چربی کوهان شتر|Camel hump fat|814|1|0|90|
اسپری روغن پخت|Cooking spray|884|0|0|100|
روغن خردل|Mustard oil|884|0|0|100|
روغن سیر (سیر در روغن)|Garlic in oil|410|1.5|7|40|
نمک خوراکی|Table salt|1|0|0|0|
نمک دریا|Sea salt|1|0|0|0|
نمک هیمالیا|Himalayan salt|1|0|0|0|
نمک سنگ|Rock salt|1|0|0|0|
فلفل سفید|White pepper|335|10.4|68.6|2.1|
فلفل قرمز پودر|Red chili powder|374|12|50|14|
فلفل قرمز کوبیده (پول بیبر)|Crushed red pepper flakes|425|12|56|17|
فلفل قرمز دلمه‌ای پودر (پاپریکا)|Paprika|389|14|54|13|
پاپریکا دودی|Smoked paprika|389|14|54|13|
فلفل کایین|Cayenne pepper|429|12|57|17|
فلفل سبز دانه|Green peppercorns|307|10|60|3|
فلفل صورتی|Pink peppercorns|307|10|60|3|
فلفل سیچوان|Sichuan pepper|352|10|60|8|
فلفل دلمه‌ای خشک|Dried bell pepper flakes|313|12|55|5|
دارچین چوب|Cinnamon stick|349|4|80.6|1.2|
هل سبز|Green cardamom|378|10.8|68.5|6.7|
هل سیاه|Black cardamom|378|10.8|68.5|6.7|
میخک|Cloves|403|6|65.5|13|
جوز هندی (جوزبوا)|Nutmeg|547|5.8|49.3|36.3|جوز هندی
بادیان خطایی|Star anise|414|17.6|50|16|
زردچوبه پودر|Turmeric powder|389|7.8|67|10|
زنجبیل پودر|Ginger powder|360|9|71.6|4.2|
زیره سبز پودر|Cumin powder|449|17.8|44.2|22.3|
زیره سیاه|Caraway seeds|410|19.8|49.9|14.6|
گشنیز پودر|Coriander powder|429|12.4|54.9|17.8|
زعفران سایده‌شده|Ground saffron|360|11.4|65.4|5.9|
زعفران دم‌کرده (محلول)|Saffron infusion|4|0.2|0.5|0.1|
سماق پودر|Sumac powder|341|4|70|5|
آویشن خشک|Dried thyme|359|9.1|63.9|7.4|
اوررگانو خشک|Dried oregano|350|9|68.9|4.3|
پونه خشک|Dried pennyroyal|325|10|60|5|
نعنا خشک|Dried mint|275|8|54|3|
ریحان خشک|Dried basil|319|23|47.8|4|
مریم‌گلی خشک|Dried sage|400|10.6|60.7|12.7|
رزماری خشک|Dried rosemary|413|4.9|64.1|15.2|
رزماری تازه|Fresh rosemary|149|3.3|20.7|5.9|
آویشن تازه|Fresh thyme|136|5.6|24.5|1.7|
اوررگانو تازه|Fresh oregano|140|4.3|21|4.3|
مریم‌گلی تازه|Fresh sage|138|3.7|21|4.4|
ترخون خشک|Dried tarragon|357|22.8|50.2|7.2|
مرزنجوش خشک|Dried marjoram|356|12.7|60.6|7|
شوید خشک|Dried dill|343|20|55.8|4.4|
جعفری خشک|Dried parsley|358|26.6|50.6|5.5|
گشنیز خشک|Dried coriander leaves|339|21.9|52.1|4.8|
شنبلیله خشک|Dried fenugreek leaves|382|23|58|6.4|
سبزی قورمه خشک|Dried ghormeh sabzi herbs|334|20|50|6|
سبزی آش خشک|Dried aash herbs|317|18|50|5|
سبزی کوکو خشک|Dried kuku herbs|317|18|50|5|
پیازچه خشک|Dried chives|312|21|49|3.5|
پیاز پودر|Onion powder|367|10.4|79.1|1|
سیر پودر|Garlic powder|364|16.6|72.7|0.7|
گرانول سیر|Garlic granules|364|16.6|72.7|0.7|
پیاز خشک (سرخ‌شده بسته‌بندی)|Fried onion flakes|531|5.6|53|33|
ادویه کاری|Curry powder|406|14.3|55.8|14|
ادویه پلو (برنج)|Rice spice mix|352|10|60|8|
ادویه کباب|Kabab spice mix|332|10|55|8|
ادویه مرغ|Chicken spice mix|326|8|60|6|
ادویه خورشتی|Stew spice mix|335|10|58|7|
ادویه ماهی|Fish spice mix|326|8|60|6|
ادویه همه‌کاره (مخلوط)|All-purpose seasoning|326|8|60|6|
گرم ماسالا|Garam masala|395|15|50|15|
ادویه تکه‌ای (راس الحانوت)|Ras el hanout|385|10|57|13|
ادویه تاکو|Taco seasoning|352|10|60|8|
زاتار|Zaatar|400|10|45|20|
دوکه (دوکا)|Dukkah|594|14|22|50|
ادویه ایتالیایی (هرب)|Italian seasoning|334|10|60|6|
ادویه مخصوص پیتزا|Pizza seasoning|334|10|60|6|
ادویه سیر و گیاهان|Garlic herb seasoning|305|10|55|5|
خردل پودر|Mustard powder|543|26.1|28.1|36.2|
پودر آبلیمو (لیموعمانی)|Lime powder|309|5|70|1|
پودر آلو|Plum powder|297|2|70|1|
پودر دارچین و شکر|Cinnamon sugar|365|0.5|90|0.3|
پودر وانیل|Vanilla powder|52|0.1|12.7|0.1|
اسانس وانیل|Vanilla extract|52|0.1|12.7|0.1|
دانه وانیل|Vanilla bean|82|3|14|1.5|
گلاب|Rose water|4|0|1|0|
عرق بهارنارنج|Orange blossom water|4|0|1|0|
عرق شاهتره|Fumitory distillate|1|0|0.2|0|
عرق کاسنی|Chicory distillate|1|0|0.2|0|
گل محمدی خشک|Dried Damask rose petals|299|8|60|3|
گل‌گاوزبان خشک|Dried borage flowers|307|10|60|3|
بهارنارنج خشک|Dried bitter orange blossom|299|8|60|3|
پودر کاکائو بدون شکر (دوتچ)|Dutch cocoa powder|422|20|54|14|
پودر ماچا|Matcha powder|321|30|39|5|
پودر اسپیرولینا|Spirulina powder|395|57.5|23.9|7.7|
پودر کلرلا|Chlorella powder|405|58|23|9|
پودر جو سبز|Barley grass powder|327|30|45|3|
پودر ریشه ماکا|Maca powder|358|14|71|2|
سرکه انگور (قرمز)|Red wine vinegar|1|0|0.3|0|
سرکه بالزامیک|Balsamic vinegar|70|0.5|17|0|
سرکه سیر|Garlic vinegar|8|0|2|0|
سرکه شیره (سرکه انگور سنتی)|Persian grape vinegar|8|0|2|0|
سرکه خرما|Date vinegar|12|0|3|0|
آبلیمو تازه|Fresh lemon juice|31|0.4|6.9|0.2|
آبلیمو بطری|Bottled lemon juice|29|0.4|6.5|0.2|
آب لیمو عمانی|Omani lime infusion|9|0.2|2|0|
سس سویا کم‌نمک|Low-sodium soy sauce|54|7|6|0.2|
سس ماهی|Fish sauce (Thai)|36|5|4|0|
سس انگور (گوجه ایرانی)|Persian ketchup|104|1.5|24|0.2|
رب انار ترش|Sour pomegranate molasses|227|1|55|0.3|
رب انار شیرین|Sweet pomegranate molasses|267|1|65|0.3|
رب آلبالو|Sour cherry paste|254|1|62|0.2|
رب نارنج|Bitter orange paste|246|1|60|0.2|
رب لیمو عمانی|Omani lime paste|217|2|50|1|
رب سیر|Garlic paste|149|6|30|0.5|
رب پیاز|Onion paste|83|2|18|0.3|
پودر شکر وانیلی|Vanilla sugar|396|0|99|0|
بکینگ پودر|Baking powder|112|0|28|0|
جوش شیرین|Baking soda|1|0|0|0|
مخمر خشک|Dry yeast|395|40.4|41.2|7.6|
مخمر تازه|Fresh yeast|83|8.4|8.1|1.9|
مخمر مغذی (نوتریشنال یست)|Nutritional yeast|389|50|36|5|
ژلاتین پودر|Gelatin powder|343|85.6|0|0.1|
آگار|Agar|351|6|81|0.3|
نشاسته ذرت پودر پودینگ|Pudding mix powder|369|1|90|0.5|
شکر نبات|Rock candy|396|0|99|0|
قند حبه‌ای|Sugar cubes|399|0|99.8|0|
شکر خرما (دیبس)|Date sugar|312|1|76|0.4|
عسل کوهی|Wild honey|322|0.4|80|0|
عسل گون|Astragalus honey|329|0.3|82|0|
عسل مورد|Myrtle honey|329|0.3|82|0|
عسل با موم|Honey with comb|323|0.4|80|0.2|
شیره درخت افرا (میپل سیروپ)|Maple syrup|269|0|67|0.1|
شیره چغندر|Beet molasses|303|1.5|74|0.1|
دوشاب خرما|Date dushab|294|1.2|72|0.1|
شیره کشمش|Raisin syrup|293|1|72|0.1|
شیره آلو|Plum syrup|276|0.8|68|0.1|
شیره زرد (شیره سفید)|Light molasses|300|0|75|0|
ملاس نیشکر|Molasses|301|0|75|0.1|
استیویا (برگ خشک)|Dried stevia leaves|324|11|62|3.5|
استیویا پودر|Stevia powder|1|0|0|0|
مالتودکسترین|Maltodextrin|380|0|96|0|
شکر دکستروز|Dextrose|400|0|100|0|
سیروپ ذرت|Corn syrup|308|0|77|0|
سیر سیاه|Black garlic|317|8|70|0.5|
پودر زنجبیل خشک|Dried ginger powder|360|9|71.6|4.2|
گل میخک خشک|Dried clove buds|403|6|65.5|13|
پودر دارچین چینی|Cassia cinnamon|349|4|80.6|1.2|
چای سبز خشک|Dried green tea leaves|292|24|40|4|
چای سیاه خشک|Dried black tea leaves|285|20|40|5|
قهوه دانه خام|Green coffee beans|386|12|62|10|
قهوه دانه برشته|Roasted coffee beans|407|14|54|15|
قهوه پودر اسپرسو|Espresso coffee powder|378|13|50|14|
قهوه فوری پودر|Instant coffee powder|217|12|41|0.5|
پودر قهوه بدون کافئین|Decaf coffee powder|217|12|41|0.5|
`;
const ING_MISC2 = `
قارچ دکمه‌ای سفید خام|White button mushrooms, raw|28|3.1|3.3|0.3|
قارچ دکمه‌ای سفید آب‌پز|White button mushrooms, boiled|27|2.9|3.1|0.3|
قارچ دکمه‌ای سفید بخارپز|White button mushrooms, steamed|28|3|3.2|0.3|
قارچ دکمه‌ای سفید تفت‌داده با روغن|White button mushrooms, sauteed in oil|83|4.3|4.3|5.4|
قارچ دکمه‌ای سفید کبابی|White button mushrooms, grilled|45|3.9|4.1|1.4|
قارچ دکمه‌ای سفید ترشی|White button mushrooms, pickled|15|1.6|2|0.1|
قارچ دکمه‌ای قهوه‌ای (کریمینی) خام|Cremini mushrooms, raw|28|2.5|4.3|0.1|
قارچ دکمه‌ای قهوه‌ای (کریمینی) آب‌پز|Cremini mushrooms, boiled|27|2.4|4.1|0.1|
قارچ دکمه‌ای قهوه‌ای (کریمینی) بخارپز|Cremini mushrooms, steamed|27|2.4|4.2|0.1|
قارچ دکمه‌ای قهوه‌ای (کریمینی) تفت‌داده با روغن|Cremini mushrooms, sauteed in oil|82|3.5|5.6|5.1|
قارچ دکمه‌ای قهوه‌ای (کریمینی) کبابی|Cremini mushrooms, grilled|44|3.1|5.4|1.1|
قارچ دکمه‌ای قهوه‌ای (کریمینی) ترشی|Cremini mushrooms, pickled|17|1.3|2.6|0.1|
قارچ پورتوبلو خام|Portobello mushrooms, raw|27|2.1|4.1|0.2|
قارچ پورتوبلو آب‌پز|Portobello mushrooms, boiled|25|2|3.9|0.2|
قارچ پورتوبلو بخارپز|Portobello mushrooms, steamed|26|2|4|0.2|
قارچ پورتوبلو تفت‌داده با روغن|Portobello mushrooms, sauteed in oil|81|2.9|5.3|5.3|
قارچ پورتوبلو کبابی|Portobello mushrooms, grilled|43|2.6|5.1|1.3|
قارچ پورتوبلو ترشی|Portobello mushrooms, pickled|15|1.1|2.5|0.1|
قارچ صدفی خام|Oyster mushrooms, raw|41|3.3|6.1|0.4|
قارچ صدفی آب‌پز|Oyster mushrooms, boiled|39|3.1|5.8|0.4|
قارچ صدفی بخارپز|Oyster mushrooms, steamed|40|3.2|5.9|0.4|
قارچ صدفی تفت‌داده با روغن|Oyster mushrooms, sauteed in oil|100|4.6|7.9|5.5|
قارچ صدفی کبابی|Oyster mushrooms, grilled|60|4.1|7.6|1.5|
قارچ صدفی ترشی|Oyster mushrooms, pickled|23|1.6|3.7|0.2|
قارچ شیتاکه خام|Shiitake mushrooms, raw|41|2.2|6.8|0.5|
قارچ شیتاکه آب‌پز|Shiitake mushrooms, boiled|39|2.1|6.5|0.5|
قارچ شیتاکه بخارپز|Shiitake mushrooms, steamed|39|2.1|6.6|0.5|
قارچ شیتاکه تفت‌داده با روغن|Shiitake mushrooms, sauteed in oil|99|3.1|8.8|5.7|
قارچ شیتاکه کبابی|Shiitake mushrooms, grilled|60|2.8|8.5|1.6|
قارچ شیتاکه ترشی|Shiitake mushrooms, pickled|23|1.1|4.1|0.3|
قارچ انوکی خام|Enoki mushrooms, raw|45|2.7|7.8|0.3|
قارچ انوکی آب‌پز|Enoki mushrooms, boiled|43|2.6|7.4|0.3|
قارچ انوکی بخارپز|Enoki mushrooms, steamed|44|2.6|7.6|0.3|
قارچ انوکی تفت‌داده با روغن|Enoki mushrooms, sauteed in oil|104|3.8|10.1|5.4|
قارچ انوکی کبابی|Enoki mushrooms, grilled|65|3.4|9.8|1.4|
قارچ انوکی ترشی|Enoki mushrooms, pickled|25|1.4|4.7|0.1|
قارچ مورل خام|Morel mushrooms, raw|38|3.1|5.1|0.6|
قارچ مورل آب‌پز|Morel mushrooms, boiled|36|2.9|4.8|0.6|
قارچ مورل بخارپز|Morel mushrooms, steamed|37|3|4.9|0.6|
قارچ مورل تفت‌داده با روغن|Morel mushrooms, sauteed in oil|96|4.3|6.6|5.8|
قارچ مورل کبابی|Morel mushrooms, grilled|57|3.9|6.4|1.8|
قارچ مورل ترشی|Morel mushrooms, pickled|22|1.6|3.1|0.3|
قارچ شانترل خام|Chanterelle mushrooms, raw|38|1.5|6.9|0.5|
قارچ شانترل آب‌پز|Chanterelle mushrooms, boiled|37|1.4|6.6|0.5|
قارچ شانترل بخارپز|Chanterelle mushrooms, steamed|37|1.5|6.7|0.5|
قارچ شانترل تفت‌داده با روغن|Chanterelle mushrooms, sauteed in oil|96|2.1|9|5.7|
قارچ شانترل کبابی|Chanterelle mushrooms, grilled|56|1.9|8.6|1.6|
قارچ شانترل ترشی|Chanterelle mushrooms, pickled|22|0.8|4.1|0.3|
قارچ پورچینی خام|Porcini mushrooms, raw|34|3.1|4.5|0.4|
قارچ پورچینی آب‌پز|Porcini mushrooms, boiled|32|2.9|4.3|0.4|
قارچ پورچینی بخارپز|Porcini mushrooms, steamed|33|3|4.4|0.4|
قارچ پورچینی تفت‌داده با روغن|Porcini mushrooms, sauteed in oil|90|4.3|5.9|5.5|
قارچ پورچینی کبابی|Porcini mushrooms, grilled|52|3.9|5.6|1.5|
قارچ پورچینی ترشی|Porcini mushrooms, pickled|19|1.6|2.7|0.2|
قارچ ماتسوتاکه خام|Matsutake mushrooms, raw|35|2|6|0.3|
قارچ ماتسوتاکه آب‌پز|Matsutake mushrooms, boiled|33|1.9|5.7|0.3|
قارچ ماتسوتاکه بخارپز|Matsutake mushrooms, steamed|34|1.9|5.8|0.3|
قارچ ماتسوتاکه تفت‌داده با روغن|Matsutake mushrooms, sauteed in oil|91|2.8|7.8|5.4|
قارچ ماتسوتاکه کبابی|Matsutake mushrooms, grilled|53|2.5|7.5|1.4|
قارچ ماتسوتاکه ترشی|Matsutake mushrooms, pickled|19|1|3.6|0.1|
قارچ مایتاکه خام|Maitake mushrooms, raw|37|1.9|6.9|0.2|
قارچ مایتاکه آب‌پز|Maitake mushrooms, boiled|35|1.8|6.6|0.2|
قارچ مایتاکه بخارپز|Maitake mushrooms, steamed|36|1.8|6.7|0.2|
قارچ مایتاکه تفت‌داده با روغن|Maitake mushrooms, sauteed in oil|95|2.7|9|5.3|
قارچ مایتاکه کبابی|Maitake mushrooms, grilled|56|2.4|8.6|1.3|
قارچ مایتاکه ترشی|Maitake mushrooms, pickled|21|0.9|4.1|0.1|
قارچ خوراکی وحشی (کوهی) خام|Wild mushrooms, raw|36|3|5|0.4|
قارچ خوراکی وحشی (کوهی) آب‌پز|Wild mushrooms, boiled|34|2.8|4.8|0.4|
قارچ خوراکی وحشی (کوهی) بخارپز|Wild mushrooms, steamed|34|2.9|4.8|0.4|
قارچ خوراکی وحشی (کوهی) تفت‌داده با روغن|Wild mushrooms, sauteed in oil|92|4.2|6.5|5.5|
قارچ خوراکی وحشی (کوهی) کبابی|Wild mushrooms, grilled|54|3.8|6.3|1.5|
قارچ خوراکی وحشی (کوهی) ترشی|Wild mushrooms, pickled|20|1.5|3|0.2|
قارچ شیمجی خام|Shimeji mushrooms, raw|31|2.5|4.5|0.3|
قارچ شیمجی آب‌پز|Shimeji mushrooms, boiled|29|2.4|4.3|0.3|
قارچ شیمجی بخارپز|Shimeji mushrooms, steamed|30|2.4|4.4|0.3|
قارچ شیمجی تفت‌داده با روغن|Shimeji mushrooms, sauteed in oil|86|3.5|5.9|5.4|
قارچ شیمجی کبابی|Shimeji mushrooms, grilled|47|3.1|5.6|1.4|
قارچ شیمجی ترشی|Shimeji mushrooms, pickled|17|1.3|2.7|0.1|
قارچ ریش‌خرسی (یال‌شیر) خام|Lion's mane mushroom, raw|37|2.5|6|0.3|
قارچ ریش‌خرسی (یال‌شیر) آب‌پز|Lion's mane mushroom, boiled|35|2.4|5.7|0.3|
قارچ ریش‌خرسی (یال‌شیر) بخارپز|Lion's mane mushroom, steamed|36|2.4|5.8|0.3|
قارچ ریش‌خرسی (یال‌شیر) تفت‌داده با روغن|Lion's mane mushroom, sauteed in oil|94|3.5|7.8|5.4|
قارچ ریش‌خرسی (یال‌شیر) کبابی|Lion's mane mushroom, grilled|55|3.1|7.5|1.4|
قارچ ریش‌خرسی (یال‌شیر) ترشی|Lion's mane mushroom, pickled|21|1.3|3.6|0.1|
پودر قارچ ریشی (گانودرما)|Reishi powder|338|20|60|2|
قارچ خشک|Dried mushrooms|358|25|60|2|
قارچ ترافل سیاه خام|Black truffle, raw|57|6|7|0.5|
قارچ ترافل سیاه آب‌پز|Black truffle, boiled|54|5.7|6.6|0.5|
قارچ ترافل سیاه بخارپز|Black truffle, steamed|55|5.8|6.8|0.5|
قارچ ترافل سیاه تفت‌داده با روغن|Black truffle, sauteed in oil|121|8.4|9.1|5.7|
قارچ ترافل سیاه کبابی|Black truffle, grilled|80|7.5|8.8|1.6|
قارچ ترافل سیاه ترشی|Black truffle, pickled|32|3|4.2|0.3|
قارچ ترافل سفید خام|White truffle, raw|57|6|7|0.5|
قارچ ترافل سفید آب‌پز|White truffle, boiled|54|5.7|6.6|0.5|
قارچ ترافل سفید بخارپز|White truffle, steamed|55|5.8|6.8|0.5|
قارچ ترافل سفید تفت‌داده با روغن|White truffle, sauteed in oil|121|8.4|9.1|5.7|
قارچ ترافل سفید کبابی|White truffle, grilled|80|7.5|8.8|1.6|
قارچ ترافل سفید ترشی|White truffle, pickled|32|3|4.2|0.3|
جوانه ماش خام|Mung bean sprouts, raw|37|3|5.9|0.2|
جوانه ماش آب‌پز|Mung bean sprouts, boiled|39|3.2|6.2|0.2|
جوانه ماش تفت‌داده|Mung bean sprouts, stir-fried|77|3.3|6.5|4.2|
جوانه عدس خام|Lentil sprouts, raw|129|9|22|0.5|
جوانه عدس آب‌پز|Lentil sprouts, boiled|135|9.5|23.1|0.5|
جوانه عدس تفت‌داده|Lentil sprouts, stir-fried|177|9.9|24.2|4.5|
جوانه گندم خام|Wheat sprouts, raw|208|8|40|1.8|
جوانه گندم آب‌پز|Wheat sprouts, boiled|219|8.4|42|1.9|
جوانه گندم تفت‌داده|Wheat sprouts, stir-fried|265|8.8|44|6|
جوانه یونجه خام|Alfalfa sprouts, raw|31|4|2.1|0.7|
جوانه یونجه آب‌پز|Alfalfa sprouts, boiled|32|4.2|2.2|0.7|
جوانه یونجه تفت‌داده|Alfalfa sprouts, stir-fried|70|4.4|2.3|4.8|
جوانه نخود خام|Chickpea sprouts, raw|139|9|20|2.5|
جوانه نخود آب‌پز|Chickpea sprouts, boiled|145|9.5|21|2.6|
جوانه نخود تفت‌داده|Chickpea sprouts, stir-fried|189|9.9|22|6.8|
جوانه سویا خام|Soybean sprouts, raw|118|9.1|9.6|4.8|
جوانه سویا آب‌پز|Soybean sprouts, boiled|124|9.6|10.1|5|
جوانه سویا تفت‌داده|Soybean sprouts, stir-fried|166|10|10.6|9.3|
جوانه کلم بروکلی خام|Broccoli sprouts, raw|32|2.8|4|0.5|
جوانه کلم بروکلی آب‌پز|Broccoli sprouts, boiled|33|2.9|4.2|0.5|
جوانه کلم بروکلی تفت‌داده|Broccoli sprouts, stir-fried|71|3.1|4.4|4.5|
جوانه تربچه خام|Radish sprouts, raw|52|3.8|3.6|2.5|
جوانه تربچه آب‌پز|Radish sprouts, boiled|55|4|3.8|2.6|
جوانه تربچه تفت‌داده|Radish sprouts, stir-fried|94|4.2|4|6.8|
جوانه شبدر خام|Clover sprouts, raw|31|4|2.5|0.5|
جوانه شبدر آب‌پز|Clover sprouts, boiled|32|4.2|2.6|0.5|
جوانه شبدر تفت‌داده|Clover sprouts, stir-fried|69|4.4|2.8|4.5|
جوانه آفتابگردان خام|Sunflower sprouts, raw|35|3|4|0.8|
جوانه آفتابگردان آب‌پز|Sunflower sprouts, boiled|37|3.2|4.2|0.8|
جوانه آفتابگردان تفت‌داده|Sunflower sprouts, stir-fried|75|3.3|4.4|4.9|
جوانه لوبیا چشم‌بلبلی خام|Black-eyed pea sprouts, raw|117|8|20|0.5|
جوانه لوبیا چشم‌بلبلی آب‌پز|Black-eyed pea sprouts, boiled|122|8.4|21|0.5|
جوانه لوبیا چشم‌بلبلی تفت‌داده|Black-eyed pea sprouts, stir-fried|164|8.8|22|4.5|
جوانه ارزن خام|Millet sprouts, raw|206|8|40|1.5|
جوانه ارزن آب‌پز|Millet sprouts, boiled|216|8.4|42|1.6|
جوانه ارزن تفت‌داده|Millet sprouts, stir-fried|263|8.8|44|5.7|
جوانه جو خام|Barley sprouts, raw|206|8|40|1.5|
جوانه جو آب‌پز|Barley sprouts, boiled|216|8.4|42|1.6|
جوانه جو تفت‌داده|Barley sprouts, stir-fried|263|8.8|44|5.7|
جوانه کینوآ خام|Quinoa sprouts, raw|182|6|35|2|
جوانه کینوآ آب‌پز|Quinoa sprouts, boiled|191|6.3|36.8|2.1|
جوانه کینوآ تفت‌داده|Quinoa sprouts, stir-fried|236|6.6|38.5|6.2|
جوانه باقلا خام|Fava bean sprouts, raw|77|6|12|0.5|
جوانه باقلا آب‌پز|Fava bean sprouts, boiled|80|6.3|12.6|0.5|
جوانه باقلا تفت‌داده|Fava bean sprouts, stir-fried|120|6.6|13.2|4.5|
جوانه لوبیا قرمز خام|Kidney bean sprouts, raw|89|6|15|0.5|
جوانه لوبیا قرمز آب‌پز|Kidney bean sprouts, boiled|93|6.3|15.8|0.5|
جوانه لوبیا قرمز تفت‌داده|Kidney bean sprouts, stir-fried|133|6.6|16.5|4.5|
سبزه نوروزی (گندم سبز) تازه خام|Wheatgrass, raw|33|3|4|0.5|
آب جوانه گندم خام|Wheatgrass juice, raw|11|0.5|2|0.1|
جوانه چاودار خام|Rye sprouts, raw|206|8|40|1.5|
جوانه چاودار آب‌پز|Rye sprouts, boiled|216|8.4|42|1.6|
جوانه چاودار تفت‌داده|Rye sprouts, stir-fried|263|8.8|44|5.7|
جوانه شنبلیله خام|Fenugreek sprouts, raw|75|5|12|0.8|
جوانه شنبلیله آب‌پز|Fenugreek sprouts, boiled|79|5.3|12.6|0.8|
جوانه شنبلیله تفت‌داده|Fenugreek sprouts, stir-fried|119|5.5|13.2|4.9|
شیر بادام بدون شکر|Unsweetened almond milk|13|0.4|0.3|1.1|
شیر بادام شیرین|Sweetened almond milk|38|0.4|6.7|1.1|
شیر بادام وانیلی|Vanilla almond milk|35|0.4|6.2|1|
شیر بادام شکلاتی|Chocolate almond milk|49|0.6|9|1.2|
شیر سویا ساده|Plain soy milk|53|3.3|6|1.8|
شیر سویا بدون شکر|Unsweetened soy milk|37|3.3|1.8|1.8|
شیر سویا وانیلی|Vanilla soy milk|61|3.3|8|1.8|
شیر سویا شکلاتی|Chocolate soy milk|71|3.2|10.5|1.8|
شیر برنج بدون شکر|Unsweetened rice milk|44|0.3|9.2|0.7|
شیر جو دوسر بدون شکر|Unsweetened oat milk|44|1|6.5|1.5|
شیر جو دوسر باریستا|Barista oat milk|58|1|6.7|3|
شیر نارگیل (نوشیدنی)|Coconut milk beverage|25|0.2|1.7|1.9|
شیر نارگیل کنسروی|Canned coconut milk|245|2.3|5.5|23.8|
شیر نارگیل کم‌چرب کنسروی|Light canned coconut milk|99|1|3.5|9|
خامه نارگیل|Coconut cream|354|3.6|6.7|34.7|
شیر فندق|Hazelnut milk|36|0.5|5|1.5|
شیر پسته|Pistachio milk|39|0.8|5|1.8|
شیر کاجو (بادام هندی)|Cashew milk|22|0.5|1.5|1.5|
شیر گردو|Walnut milk|32|0.8|1.5|2.5|
شیر کنجد|Sesame milk|34|1|3|2|
شیر نخود|Pea milk|35|2|1|2.5|
شیر کینوآ|Quinoa milk|46|0.7|7.5|1.5|
شیر شاهدانه|Hemp milk|33|0.5|1|3|
شیر آمارانت|Amaranth milk|35|0.5|6|1|
شیر خرما|Date milk|44|0.8|9|0.5|
شیر بادام زمینی|Peanut milk|53|1.5|6|2.5|
شیر کتان|Flax milk|18|0.4|1.5|1.2|
شیر عدس|Lentil milk|37|1.5|5|1.2|
شیر بلغور گندم|Spelt milk|40|0.8|7|1|
شیر مغز تخم کدو|Pumpkin seed milk|37|1.5|2|2.5|
شیر نخودچی (حمص مایع)|Chickpea milk|40|1.5|5|1.5|
پودر شیر سویا|Soy milk powder|472|38|35|20|
پودر شیر نارگیل|Coconut milk powder|689|6|20|65|
پودر شیر بادام|Almond milk powder|505|15|55|25|
پودر شیر جو دوسر|Oat milk powder|416|5|72|12|
ماست بادام|Almond yogurt|72|3|7|3.5|
خامه گیاهی (خامه جو دوسر)|Oat cream|136|1|6|12|
پنیر بادام (گیاهی)|Almond cheese (vegan)|246|6|6|22|
پنیر کاجو گیاهی|Cashew cheese (vegan)|288|6|12|24|
پنیر سویا گیاهی|Soy cheese (vegan)|210|15|6|14|
پنیر نارگیل گیاهی|Coconut cheese (vegan)|273|1|20|21|
کره گیاهی بادام|Vegan almond butter spread|646|1|3|70|
توفو نرم|Soft tofu|51|4.8|1.9|2.7|
توفو سفت|Firm tofu|83|8|1.9|4.8|
توفو خیلی سفت (اکسترا فرم)|Extra firm tofu|98|10|2|5.5|
توفو ابریشمی|Silken tofu|51|4.8|1.9|2.7|
توفو سرخ‌شده|Fried tofu|285|15.7|10.5|20|
توفو کبابی|Grilled tofu|119|11|3|7|
توفو بخارپز|Steamed tofu|83|8|2|4.8|
توفو تفت‌داده با روغن|Pan-fried tofu|168|12|3|12|
توفو دودی|Smoked tofu|153|15|3|9|
توفو خشک (یخ‌زده خشک)|Dried frozen tofu|477|50|4|29|
پوست توفو (یوبا)|Tofu skin (yuba)|473|52|10|25|
توفو تخمیری (توفو بدبو)|Fermented tofu|119|10|4|7|
توفو ادویه‌دار|Seasoned tofu|136|12|4|8|
تمپه خام|Raw tempeh|211|19|9|11|
تمپه سرخ‌شده|Fried tempeh|278|20|9|18|
تمپه کبابی|Grilled tempeh|228|21|9|12|
تمپه بخارپز|Steamed tempeh|211|19|9|11|
تمپه ادویه‌دار|Seasoned tempeh|228|19|11|12|
سیتان (گوشت گندم)|Seitan|173|25|14|1.9|
سیتان سرخ‌شده|Fried seitan|228|25|14|8|
سیتان کبابی|Grilled seitan|183|26|13|3|
سیتان آب‌پز|Boiled seitan|150|22|12|1.5|
گلوتن سرخ‌شده (کبابی چینی)|Fried gluten|276|30|12|12|
پروتئین سویا بافت‌دار (خشک)|Textured soy protein, dry|337|52|30|1|
پروتئین سویا بافت‌دار (آب‌دیده)|Textured soy protein, hydrated|112|17|10|0.4|
قطعات سویا (سویا مرغی)|Soy chunks|345|52|33|0.5|
سویا چرخ‌کرده|Soy mince|341|50|33|1|
برگر نخودی|Chickpea burger|158|8|18|6|
برگر عدسی|Lentil burger|152|9|20|4|
برگر لوبیا سیاه|Black bean burger|144|8|19|4|
ناگت گیاهی|Veggie nugget|218|14|18|10|
سوسیس گیاهی|Veggie sausage|182|15|8|10|
کباب گیاهی|Veggie kebab|168|12|12|8|
کوفته گیاهی|Veggie meatball|172|11|14|8|
مایکوپروتئین (کورن)|Mycoprotein|83|11|3|3|
پروتئین نخود ایزوله|Pea protein isolate|385|80|5|5|
پروتئین برنج|Rice protein powder|370|80|8|2|
پروتئین سویا ایزوله|Soy protein isolate|387|88|2|3|
پروتئین شاهدانه|Hemp protein powder|370|50|20|10|
پروتئین کدو|Pumpkin seed protein|372|60|15|8|
لوبیا سویا تخمیر شده (ناتو)|Natto|227|17.7|14.4|11|
میسو|Miso paste|207|12.8|25.4|6|
میسو قرمز|Red miso|202|13|24|6|
میسو سفید|White miso|188|10|28|4|
پاستا سویا (نودل سویا)|Soy noodles|392|40|40|8|
پنیر توفو|Tofu cheese|114|12|3|6|
پروتئین بافت‌دار نخود|Textured pea protein|314|55|20|1.5|
جک‌فروت کنسروی (گوشت گیاهی)|Canned jackfruit meat substitute|61|1.5|13|0.3|
شیر خشک نوزاد (پودر مرحله 1)|Infant formula powder stage 1|510|11|56|26|
شیر خشک نوزاد آماده مصرف|Infant formula, prepared|67|1.4|7.3|3.5|
شیر خشک مرحله 2 آماده مصرف|Follow-on formula, prepared|67|1.5|7.5|3.3|
شیر خشک مرحله 3 آماده مصرف|Toddler formula, prepared|66|1.7|7.8|3.1|
شیر خشک بدون لاکتوز آماده|Lactose-free formula, prepared|67|1.5|7.3|3.5|
شیر خشک سویا نوزاد آماده|Soy infant formula, prepared|67|1.6|7|3.5|
سرلاک برنج و موز|Rice and banana baby cereal|380|7|78|2|
سرلاک جو دوسر|Oat baby cereal|400|12|70|6|
سرلاک چند غله|Multigrain baby cereal|390|10|72|4|
سرلاک آماده مصرف با شیر|Baby cereal with milk, prepared|100|3|17|2.5|
سرلاک برنج آماده مصرف|Rice baby cereal, prepared|60|1.5|12|0.5|
پوره سیب نوزاد|Baby apple puree|50|0.3|12|0.1|
پوره گلابی نوزاد|Baby pear puree|54|0.3|13|0.1|
پوره موز نوزاد|Baby banana puree|80|1|20|0.3|
پوره هلو نوزاد|Baby peach puree|51|0.5|12|0.1|
پوره آلو نوزاد|Baby prune puree|70|0.7|17|0.1|
پوره انبه نوزاد|Baby mango puree|58|0.5|14|0.2|
پوره سیب و موز نوزاد|Baby apple banana puree|62|0.6|15|0.2|
پوره هویج نوزاد|Baby carrot puree|28|0.7|6|0.2|
پوره سیب‌زمینی نوزاد|Baby potato puree|45|1.5|9|0.2|
پوره سیب‌زمینی شیرین نوزاد|Baby sweet potato puree|56|1.2|13|0.2|
پوره کدو حلوایی نوزاد|Baby pumpkin puree|28|0.8|6|0.1|
پوره کدو سبز نوزاد|Baby zucchini puree|19|0.9|3.5|0.2|
پوره نخود فرنگی نوزاد|Baby pea puree|47|3|8|0.3|
پوره لوبیا سبز نوزاد|Baby green bean puree|27|1.2|5|0.2|
پوره اسفناج نوزاد|Baby spinach puree|25|2|3.5|0.3|
پوره بروکلی نوزاد|Baby broccoli puree|32|2.3|5|0.3|
پوره سبزیجات مخلوط نوزاد|Baby mixed vegetable puree|32|1.5|6|0.3|
پوره مرغ و سبزیجات نوزاد|Baby chicken vegetable puree|54|4|5|2|
پوره گوشت گوساله و سبزیجات نوزاد|Baby beef vegetable puree|58|4.5|5|2.2|
پوره بره و سبزیجات نوزاد|Baby lamb vegetable puree|58|4|5|2.5|
پوره ماهی و سبزیجات نوزاد|Baby fish vegetable puree|54|4|5|2|
پوره بوقلمون و سبزیجات نوزاد|Baby turkey vegetable puree|54|4.5|5|1.8|
پوره عدس و سبزیجات نوزاد|Baby lentil vegetable puree|54|3.5|9|0.5|
پوره نخود و سبزیجات نوزاد|Baby chickpea vegetable puree|61|3|10|1|
پوره تخم‌مرغ و سبزیجات نوزاد|Baby egg vegetable puree|65|4.5|5|3|
پوره برنج و مرغ نوزاد|Baby rice chicken puree|68|3.5|10|1.5|
پوره ماکارونی و گوشت نوزاد|Baby pasta beef puree|78|4|11|2|
فرنی نوزاد (شیر و برنج)|Baby rice pudding (farni)|91|3|14|2.5|
فرنی نوزاد با موز|Baby farni with banana|100|3|17|2.5|
فرنی نوزاد با سیب|Baby farni with apple|95|3|16|2.5|
حریره بادام نوزاد|Baby almond haririeh|110|3|18|4|
سوپ مرغ نوزاد (له‌شده)|Baby chicken soup, blended|45|3|5|1.5|
سوپ سبزیجات نوزاد (له‌شده)|Baby vegetable soup, blended|33|1|6|0.6|
سوپ جو نوزاد (له‌شده)|Baby barley soup, blended|49|2|8|1|
سوپ عدس نوزاد (له‌شده)|Baby lentil soup, blended|55|3|9|0.8|
آش دوغ نوزاد|Baby doogh soup|52|2.5|7|1.5|
پوره کیوی نوزاد|Baby kiwi puree|52|0.8|12|0.3|
پوره آووکادو نوزاد|Baby avocado puree|143|1.8|7|12|
پوره سیب و هویج نوزاد|Baby apple carrot puree|40|0.5|9|0.2|
پوره سیب و توت‌فرنگی نوزاد|Baby apple strawberry puree|47|0.5|11|0.2|
پوره میوه مخلوط نوزاد|Baby mixed fruit puree|55|0.5|13|0.2|
پوره میوه مخلوط با ماست نوزاد|Baby fruit with yogurt puree|77|2|14|1.5|
ماست نوزاد (میوه‌ای)|Baby fruit yogurt|91|3|14|2.5|
ماست نوزاد ساده|Baby plain yogurt|65|3.5|5|3.5|
پنیر نوزاد (کم‌نمک)|Baby low-salt cheese|187|11|3|15|
بیسکویت نوزاد|Baby biscuit|410|7|77|8|
بیسکویت دندان‌درآوری نوزاد|Teething biscuit|380|8|75|5|
نان نوزاد (پروتئینی)|Baby cracker|390|9|72|6|
پفک نوزاد (حل‌شدنی)|Baby melt puffs|380|5|80|2|
پفک نوزاد میوه‌ای|Baby fruit melt puffs|380|4|82|1.5|
پفک نوزاد اسفناجی|Baby spinach melts|378|5|78|2.5|
رول میوه نوزاد (میوه نواری)|Baby fruit strip|313|1|75|1|
پوره سیب‌زمینی با پنیر نوزاد|Baby potato cheese puree|79|3|10|3|
سبزیجات پخته نوزاد (کامل)|Baby steamed vegetables|44|2|8|0.4|
سیب پخته نوزاد (له‌شده)|Baby baked apple|59|0.3|14|0.2|
هویج پخته (لهیده) نوزاد|Baby mashed carrot|41|0.9|8|0.2|
نخود پخته (لهیده) نوزاد|Baby mashed chickpeas|94|4.5|14|2.3|
لوبیا پخته (لهیده) نوزاد|Baby mashed beans|85|5|15|0.5|
مرغ پخته (چرخ‌شده) نوزاد|Baby minced chicken|140|25|0|4.5|
گوشت گوساله پخته (چرخ‌شده) نوزاد|Baby minced veal|149|26|0|5|
ماهی پخته (لهیده) نوزاد|Baby mashed fish|115|22|0|3|
زرده تخم‌مرغ پخته (نوزاد)|Baby egg yolk, boiled|335|16|3.6|26.5|
فرنی جو دوسر نوزاد|Baby oat porridge|72|2.5|12|1.5|
فرنی ذرت نوزاد|Baby corn porridge|69|2|13|1|
فرنی کینوآ نوزاد|Baby quinoa porridge|82|3|13|2|
سوپ لپه نوزاد|Baby split pea soup|52|3|9|0.5|
کدو و سیب‌زمینی نوزاد|Baby squash potato puree|39|1.2|8|0.2|
گوجه و مرغ نوزاد|Baby tomato chicken puree|54|4|5|2|
پوره زردآلو نوزاد|Baby apricot puree|49|0.8|11|0.2|
پوره گیلاس نوزاد|Baby cherry puree|57|0.8|13|0.2|
پوره انجیر نوزاد|Baby fig puree|74|0.8|17|0.3|
پوره خرما نوزاد|Baby date puree|170|1.8|40|0.2|
پوره آلوی خشک نوزاد|Baby dried plum puree|137|1.5|32|0.3|
پوره زرد آلو خشک نوزاد|Baby dried apricot puree|130|2|30|0.4|
آب سیب رقیق نوزاد|Baby diluted apple juice|21|0.1|5|0|
آب گلابی رقیق نوزاد|Baby diluted pear juice|23|0.1|5.5|0|
آب آلوی خشک رقیق نوزاد|Baby diluted prune juice|33|0.2|8|0|
دم‌کرده رازیانه نوزاد|Baby fennel tea|1|0|0.3|0|
آبگوشت نوزاد (له‌شده)|Baby abgoosht, blended|75|4|8|3|
پوره کدو و مرغ نوزاد|Baby squash chicken puree|52|4|5|1.8|
پوره عدس و برنج نوزاد|Baby lentil rice puree|75|3.5|14|0.5|
پوره مغز بادام (نوزاد)|Baby almond puree|116|3|8|8|
پوره گردو نوزاد|Baby walnut puree|113|3|5|9|
`;

export const INGREDIENTS = ING_MEAT + ING_FISH + ING_EGGS + ING_VEG + ING_FRUIT + ING_GRAIN + ING_LEGNUT + ING_MISC + ING_MISC2;
