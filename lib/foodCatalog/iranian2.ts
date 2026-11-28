// کاتالوگ غذا (ایرانی 2): غذاهای خانگی و محلی ایران به تفکیک استان، آش و سوپ، خورش، پلو و کته، کباب، کوکو و کتلت، دلمه، نذری، صبحانه، خیابانی، ترشی و سالاد.
// قالب خط مثل snacks.ts؛ مقدار به‌ازای 100 گرم (یا میلی‌لیتر).
const A = `
خورش قورمه سبزی با مرغ|Ghormeh sabzi stew with chicken|109|8.3|6|5.7|قرمه سبزی;قورمه‌سبزی;خورش قورمه سبزی مرغ
خورش قورمه سبزی با مرغ کم‌روغن|Ghormeh sabzi stew with chicken, low-oil|87|8.3|6|3.3|قرمه سبزی;قورمه‌سبزی;خورش قورمه سبزی مرغ
خورش قورمه سبزی با مرغ پرروغن رستورانی|Ghormeh sabzi stew with chicken, rich restaurant-style|137|8.3|6|8.9|قرمه سبزی;قورمه‌سبزی;خورش قورمه سبزی مرغ
خورش قورمه سبزی با ران مرغ|Ghormeh sabzi stew with chicken thigh|118|7.7|6|7|قرمه سبزی;قورمه‌سبزی;خورش قورمه سبزی ران مرغ
خورش قورمه سبزی با گوشت گوسفندی|Ghormeh sabzi stew with lamb|132|7.9|6|8.5|قرمه سبزی;قورمه‌سبزی;خورش قورمه سبزی گوشت گوسفند;گوسفندی
خورش قورمه سبزی با گوشت گوسفندی کم‌روغن|Ghormeh sabzi stew with lamb, low-oil|111|7.9|6|6.1|قرمه سبزی;قورمه‌سبزی;خورش قورمه سبزی گوشت گوسفند;گوسفندی
خورش قورمه سبزی با گوشت گوسفندی پرروغن رستورانی|Ghormeh sabzi stew with lamb, rich restaurant-style|161|7.9|6|11.7|قرمه سبزی;قورمه‌سبزی;خورش قورمه سبزی گوشت گوسفند;گوسفندی
خورش قورمه سبزی با گوشت گاو|Ghormeh sabzi stew with beef|120|8.5|6|6.9|قرمه سبزی;قورمه‌سبزی;خورش قورمه سبزی گوشت گاو;گوساله
خورش قورمه سبزی با گوشت گاو کم‌روغن|Ghormeh sabzi stew with beef, low-oil|99|8.5|6|4.5|قرمه سبزی;قورمه‌سبزی;خورش قورمه سبزی گوشت گاو;گوساله
خورش قورمه سبزی با گوشت گاو پرروغن رستورانی|Ghormeh sabzi stew with beef, rich restaurant-style|149|8.5|6|10.1|قرمه سبزی;قورمه‌سبزی;خورش قورمه سبزی گوشت گاو;گوساله
خورش قورمه سبزی گیاهی (بدون گوشت)|Ghormeh sabzi stew vegetarian|80|3.9|6|4.5|قرمه سبزی;قورمه‌سبزی;خورش قورمه سبزی بدون گوشت;وگان
خورش قورمه سبزی گیاهی (بدون گوشت) کم‌روغن|Ghormeh sabzi stew vegetarian, low-oil|59|3.9|6|2.1|قرمه سبزی;قورمه‌سبزی;خورش قورمه سبزی بدون گوشت;وگان
خورش قورمه سبزی گیاهی (بدون گوشت) پرروغن رستورانی|Ghormeh sabzi stew vegetarian, rich restaurant-style|109|3.9|6|7.7|قرمه سبزی;قورمه‌سبزی;خورش قورمه سبزی بدون گوشت;وگان
خورش قیمه لپه با مرغ|Gheymeh split pea stew with chicken|119|8.8|8|5.7|قیمه;خورش قیمه لپه مرغ
خورش قیمه لپه با مرغ کم‌روغن|Gheymeh split pea stew with chicken, low-oil|97|8.8|8|3.3|قیمه;خورش قیمه لپه مرغ
خورش قیمه لپه با مرغ پرروغن رستورانی|Gheymeh split pea stew with chicken, rich restaurant-style|147|8.8|8|8.9|قیمه;خورش قیمه لپه مرغ
خورش قیمه لپه با ران مرغ|Gheymeh split pea stew with chicken thigh|128|8.2|8|7|قیمه;خورش قیمه لپه ران مرغ
خورش قیمه لپه با گوشت گوسفندی|Gheymeh split pea stew with lamb|142|8.4|8|8.5|قیمه;خورش قیمه لپه گوشت گوسفند;گوسفندی
خورش قیمه لپه با گوشت گوسفندی کم‌روغن|Gheymeh split pea stew with lamb, low-oil|121|8.4|8|6.1|قیمه;خورش قیمه لپه گوشت گوسفند;گوسفندی
خورش قیمه لپه با گوشت گوسفندی پرروغن رستورانی|Gheymeh split pea stew with lamb, rich restaurant-style|171|8.4|8|11.7|قیمه;خورش قیمه لپه گوشت گوسفند;گوسفندی
خورش قیمه لپه با گوشت گاو|Gheymeh split pea stew with beef|130|9|8|6.9|قیمه;خورش قیمه لپه گوشت گاو;گوساله
خورش قیمه لپه با گوشت گاو کم‌روغن|Gheymeh split pea stew with beef, low-oil|109|9|8|4.5|قیمه;خورش قیمه لپه گوشت گاو;گوساله
خورش قیمه لپه با گوشت گاو پرروغن رستورانی|Gheymeh split pea stew with beef, rich restaurant-style|159|9|8|10.1|قیمه;خورش قیمه لپه گوشت گاو;گوساله
خورش قیمه لپه گیاهی (بدون گوشت)|Gheymeh split pea stew vegetarian|90|4.4|8|4.5|قیمه;خورش قیمه لپه بدون گوشت;وگان
خورش قیمه لپه گیاهی (بدون گوشت) کم‌روغن|Gheymeh split pea stew vegetarian, low-oil|69|4.4|8|2.1|قیمه;خورش قیمه لپه بدون گوشت;وگان
خورش قیمه لپه گیاهی (بدون گوشت) پرروغن رستورانی|Gheymeh split pea stew vegetarian, rich restaurant-style|119|4.4|8|7.7|قیمه;خورش قیمه لپه بدون گوشت;وگان
خورش قیمه بادمجان با مرغ|Gheymeh bademjan stew with chicken|111|7.8|6|6.2|خورش قیمه بادمجان مرغ
خورش قیمه بادمجان با مرغ کم‌روغن|Gheymeh bademjan stew with chicken, low-oil|89|7.8|6|3.8|خورش قیمه بادمجان مرغ
خورش قیمه بادمجان با مرغ پرروغن رستورانی|Gheymeh bademjan stew with chicken, rich restaurant-style|140|7.8|6|9.4|خورش قیمه بادمجان مرغ
خورش قیمه بادمجان با ران مرغ|Gheymeh bademjan stew with chicken thigh|120|7.2|6|7.5|خورش قیمه بادمجان ران مرغ
خورش قیمه بادمجان با گوشت گوسفندی|Gheymeh bademjan stew with lamb|135|7.4|6|9|خورش قیمه بادمجان گوشت گوسفند;گوسفندی
خورش قیمه بادمجان با گوشت گوسفندی کم‌روغن|Gheymeh bademjan stew with lamb, low-oil|113|7.4|6|6.6|خورش قیمه بادمجان گوشت گوسفند;گوسفندی
خورش قیمه بادمجان با گوشت گوسفندی پرروغن رستورانی|Gheymeh bademjan stew with lamb, rich restaurant-style|163|7.4|6|12.2|خورش قیمه بادمجان گوشت گوسفند;گوسفندی
خورش قیمه بادمجان با گوشت گاو|Gheymeh bademjan stew with beef|123|8|6|7.4|خورش قیمه بادمجان گوشت گاو;گوساله
خورش قیمه بادمجان با گوشت گاو کم‌روغن|Gheymeh bademjan stew with beef, low-oil|101|8|6|5|خورش قیمه بادمجان گوشت گاو;گوساله
خورش قیمه بادمجان با گوشت گاو پرروغن رستورانی|Gheymeh bademjan stew with beef, rich restaurant-style|151|8|6|10.6|خورش قیمه بادمجان گوشت گاو;گوساله
خورش قیمه بادمجان گیاهی (بدون گوشت)|Gheymeh bademjan stew vegetarian|83|3.4|6|5|خورش قیمه بادمجان بدون گوشت;وگان
خورش قیمه بادمجان گیاهی (بدون گوشت) کم‌روغن|Gheymeh bademjan stew vegetarian, low-oil|61|3.4|6|2.6|خورش قیمه بادمجان بدون گوشت;وگان
خورش قیمه بادمجان گیاهی (بدون گوشت) پرروغن رستورانی|Gheymeh bademjan stew vegetarian, rich restaurant-style|111|3.4|6|8.2|خورش قیمه بادمجان بدون گوشت;وگان
خورش قیمه سیب‌زمینی با مرغ|Gheymeh potato stew with chicken|132|7.8|10|6.7|خورش قیمه سیب‌زمینی مرغ
خورش قیمه سیب‌زمینی با مرغ کم‌روغن|Gheymeh potato stew with chicken, low-oil|110|7.8|10|4.3|خورش قیمه سیب‌زمینی مرغ
خورش قیمه سیب‌زمینی با مرغ پرروغن رستورانی|Gheymeh potato stew with chicken, rich restaurant-style|160|7.8|10|9.9|خورش قیمه سیب‌زمینی مرغ
خورش قیمه سیب‌زمینی با ران مرغ|Gheymeh potato stew with chicken thigh|141|7.2|10|8|خورش قیمه سیب‌زمینی ران مرغ
خورش قیمه سیب‌زمینی با گوشت گوسفندی|Gheymeh potato stew with lamb|155|7.4|10|9.5|خورش قیمه سیب‌زمینی گوشت گوسفند;گوسفندی
خورش قیمه سیب‌زمینی با گوشت گوسفندی کم‌روغن|Gheymeh potato stew with lamb, low-oil|134|7.4|10|7.1|خورش قیمه سیب‌زمینی گوشت گوسفند;گوسفندی
خورش قیمه سیب‌زمینی با گوشت گوسفندی پرروغن رستورانی|Gheymeh potato stew with lamb, rich restaurant-style|184|7.4|10|12.7|خورش قیمه سیب‌زمینی گوشت گوسفند;گوسفندی
خورش قیمه سیب‌زمینی با گوشت گاو|Gheymeh potato stew with beef|143|8|10|7.9|خورش قیمه سیب‌زمینی گوشت گاو;گوساله
خورش قیمه سیب‌زمینی با گوشت گاو کم‌روغن|Gheymeh potato stew with beef, low-oil|122|8|10|5.5|خورش قیمه سیب‌زمینی گوشت گاو;گوساله
خورش قیمه سیب‌زمینی با گوشت گاو پرروغن رستورانی|Gheymeh potato stew with beef, rich restaurant-style|172|8|10|11.1|خورش قیمه سیب‌زمینی گوشت گاو;گوساله
خورش قیمه سیب‌زمینی گیاهی (بدون گوشت)|Gheymeh potato stew vegetarian|103|3.4|10|5.5|خورش قیمه سیب‌زمینی بدون گوشت;وگان
خورش قیمه سیب‌زمینی گیاهی (بدون گوشت) کم‌روغن|Gheymeh potato stew vegetarian, low-oil|82|3.4|10|3.1|خورش قیمه سیب‌زمینی بدون گوشت;وگان
خورش قیمه سیب‌زمینی گیاهی (بدون گوشت) پرروغن رستورانی|Gheymeh potato stew vegetarian, rich restaurant-style|132|3.4|10|8.7|خورش قیمه سیب‌زمینی بدون گوشت;وگان
خورش قیمه نثار با مرغ|Gheymeh nesar stew with chicken|136|7.8|10|7.2|قیمه نثار;خورش قیمه نثار مرغ
خورش قیمه نثار با مرغ کم‌روغن|Gheymeh nesar stew with chicken, low-oil|114|7.8|10|4.8|قیمه نثار;خورش قیمه نثار مرغ
خورش قیمه نثار با مرغ پرروغن رستورانی|Gheymeh nesar stew with chicken, rich restaurant-style|165|7.8|10|10.4|قیمه نثار;خورش قیمه نثار مرغ
خورش قیمه نثار با ران مرغ|Gheymeh nesar stew with chicken thigh|145|7.2|10|8.5|قیمه نثار;خورش قیمه نثار ران مرغ
خورش قیمه نثار با گوشت گوسفندی|Gheymeh nesar stew with lamb|160|7.4|10|10|قیمه نثار;خورش قیمه نثار گوشت گوسفند;گوسفندی
خورش قیمه نثار با گوشت گوسفندی کم‌روغن|Gheymeh nesar stew with lamb, low-oil|138|7.4|10|7.6|قیمه نثار;خورش قیمه نثار گوشت گوسفند;گوسفندی
خورش قیمه نثار با گوشت گوسفندی پرروغن رستورانی|Gheymeh nesar stew with lamb, rich restaurant-style|188|7.4|10|13.2|قیمه نثار;خورش قیمه نثار گوشت گوسفند;گوسفندی
خورش قیمه نثار با گوشت گاو|Gheymeh nesar stew with beef|148|8|10|8.4|قیمه نثار;خورش قیمه نثار گوشت گاو;گوساله
خورش قیمه نثار با گوشت گاو کم‌روغن|Gheymeh nesar stew with beef, low-oil|126|8|10|6|قیمه نثار;خورش قیمه نثار گوشت گاو;گوساله
خورش قیمه نثار با گوشت گاو پرروغن رستورانی|Gheymeh nesar stew with beef, rich restaurant-style|176|8|10|11.6|قیمه نثار;خورش قیمه نثار گوشت گاو;گوساله
خورش قیمه نثار گیاهی (بدون گوشت)|Gheymeh nesar stew vegetarian|108|3.4|10|6|قیمه نثار;خورش قیمه نثار بدون گوشت;وگان
خورش قیمه نثار گیاهی (بدون گوشت) کم‌روغن|Gheymeh nesar stew vegetarian, low-oil|86|3.4|10|3.6|قیمه نثار;خورش قیمه نثار بدون گوشت;وگان
خورش قیمه نثار گیاهی (بدون گوشت) پرروغن رستورانی|Gheymeh nesar stew vegetarian, rich restaurant-style|136|3.4|10|9.2|قیمه نثار;خورش قیمه نثار بدون گوشت;وگان
خورش قیمه کدو با مرغ|Gheymeh squash stew with chicken|111|7.8|7|5.7|خورش قیمه کدو مرغ
خورش قیمه کدو با مرغ کم‌روغن|Gheymeh squash stew with chicken, low-oil|89|7.8|7|3.3|خورش قیمه کدو مرغ
خورش قیمه کدو با مرغ پرروغن رستورانی|Gheymeh squash stew with chicken, rich restaurant-style|139|7.8|7|8.9|خورش قیمه کدو مرغ
خورش قیمه کدو با ران مرغ|Gheymeh squash stew with chicken thigh|120|7.2|7|7|خورش قیمه کدو ران مرغ
خورش قیمه کدو با گوشت گوسفندی|Gheymeh squash stew with lamb|134|7.4|7|8.5|خورش قیمه کدو گوشت گوسفند;گوسفندی
خورش قیمه کدو با گوشت گوسفندی کم‌روغن|Gheymeh squash stew with lamb, low-oil|113|7.4|7|6.1|خورش قیمه کدو گوشت گوسفند;گوسفندی
خورش قیمه کدو با گوشت گوسفندی پرروغن رستورانی|Gheymeh squash stew with lamb, rich restaurant-style|163|7.4|7|11.7|خورش قیمه کدو گوشت گوسفند;گوسفندی
خورش قیمه کدو با گوشت گاو|Gheymeh squash stew with beef|122|8|7|6.9|خورش قیمه کدو گوشت گاو;گوساله
خورش قیمه کدو با گوشت گاو کم‌روغن|Gheymeh squash stew with beef, low-oil|101|8|7|4.5|خورش قیمه کدو گوشت گاو;گوساله
خورش قیمه کدو با گوشت گاو پرروغن رستورانی|Gheymeh squash stew with beef, rich restaurant-style|151|8|7|10.1|خورش قیمه کدو گوشت گاو;گوساله
خورش قیمه کدو گیاهی (بدون گوشت)|Gheymeh squash stew vegetarian|82|3.4|7|4.5|خورش قیمه کدو بدون گوشت;وگان
خورش قیمه کدو گیاهی (بدون گوشت) کم‌روغن|Gheymeh squash stew vegetarian, low-oil|61|3.4|7|2.1|خورش قیمه کدو بدون گوشت;وگان
خورش قیمه کدو گیاهی (بدون گوشت) پرروغن رستورانی|Gheymeh squash stew vegetarian, rich restaurant-style|111|3.4|7|7.7|خورش قیمه کدو بدون گوشت;وگان
خورش قیمه ریواس با مرغ|Gheymeh rhubarb stew with chicken|107|7.8|6|5.7|خورش قیمه ریواس مرغ
خورش قیمه ریواس با مرغ کم‌روغن|Gheymeh rhubarb stew with chicken, low-oil|85|7.8|6|3.3|خورش قیمه ریواس مرغ
خورش قیمه ریواس با مرغ پرروغن رستورانی|Gheymeh rhubarb stew with chicken, rich restaurant-style|135|7.8|6|8.9|خورش قیمه ریواس مرغ
خورش قیمه ریواس با ران مرغ|Gheymeh rhubarb stew with chicken thigh|116|7.2|6|7|خورش قیمه ریواس ران مرغ
خورش قیمه ریواس با گوشت گوسفندی|Gheymeh rhubarb stew with lamb|130|7.4|6|8.5|خورش قیمه ریواس گوشت گوسفند;گوسفندی
خورش قیمه ریواس با گوشت گوسفندی کم‌روغن|Gheymeh rhubarb stew with lamb, low-oil|109|7.4|6|6.1|خورش قیمه ریواس گوشت گوسفند;گوسفندی
خورش قیمه ریواس با گوشت گوسفندی پرروغن رستورانی|Gheymeh rhubarb stew with lamb, rich restaurant-style|159|7.4|6|11.7|خورش قیمه ریواس گوشت گوسفند;گوسفندی
خورش قیمه ریواس با گوشت گاو|Gheymeh rhubarb stew with beef|118|8|6|6.9|خورش قیمه ریواس گوشت گاو;گوساله
خورش قیمه ریواس با گوشت گاو کم‌روغن|Gheymeh rhubarb stew with beef, low-oil|97|8|6|4.5|خورش قیمه ریواس گوشت گاو;گوساله
خورش قیمه ریواس با گوشت گاو پرروغن رستورانی|Gheymeh rhubarb stew with beef, rich restaurant-style|147|8|6|10.1|خورش قیمه ریواس گوشت گاو;گوساله
خورش قیمه ریواس گیاهی (بدون گوشت)|Gheymeh rhubarb stew vegetarian|78|3.4|6|4.5|خورش قیمه ریواس بدون گوشت;وگان
خورش قیمه ریواس گیاهی (بدون گوشت) کم‌روغن|Gheymeh rhubarb stew vegetarian, low-oil|57|3.4|6|2.1|خورش قیمه ریواس بدون گوشت;وگان
خورش قیمه ریواس گیاهی (بدون گوشت) پرروغن رستورانی|Gheymeh rhubarb stew vegetarian, rich restaurant-style|107|3.4|6|7.7|خورش قیمه ریواس بدون گوشت;وگان
خورش فسنجان با مرغ کم‌روغن|Fesenjan stew with chicken, low-oil|145|8.8|10|7.8|فسنجون;خورش فسنجان مرغ
خورش فسنجان با مرغ پرروغن رستورانی|Fesenjan stew with chicken, rich restaurant-style|196|8.8|10|13.4|فسنجون;خورش فسنجان مرغ
خورش فسنجان با ران مرغ|Fesenjan stew with chicken thigh|176|8.2|10|11.5|فسنجون;خورش فسنجان ران مرغ
خورش فسنجان با گوشت گوسفندی|Fesenjan stew with lamb|191|8.4|10|13|فسنجون;خورش فسنجان گوشت گوسفند;گوسفندی
خورش فسنجان با گوشت گوسفندی کم‌روغن|Fesenjan stew with lamb, low-oil|169|8.4|10|10.6|فسنجون;خورش فسنجان گوشت گوسفند;گوسفندی
خورش فسنجان با گوشت گوسفندی پرروغن رستورانی|Fesenjan stew with lamb, rich restaurant-style|219|8.4|10|16.2|فسنجون;خورش فسنجان گوشت گوسفند;گوسفندی
خورش فسنجان با گوشت گاو|Fesenjan stew with beef|179|9|10|11.4|فسنجون;خورش فسنجان گوشت گاو;گوساله
خورش فسنجان با گوشت گاو کم‌روغن|Fesenjan stew with beef, low-oil|157|9|10|9|فسنجون;خورش فسنجان گوشت گاو;گوساله
خورش فسنجان با گوشت گاو پرروغن رستورانی|Fesenjan stew with beef, rich restaurant-style|207|9|10|14.6|فسنجون;خورش فسنجان گوشت گاو;گوساله
خورش فسنجان گیاهی (بدون گوشت)|Fesenjan stew vegetarian|139|4.4|10|9|فسنجون;خورش فسنجان بدون گوشت;وگان
خورش فسنجان گیاهی (بدون گوشت) کم‌روغن|Fesenjan stew vegetarian, low-oil|117|4.4|10|6.6|فسنجون;خورش فسنجان بدون گوشت;وگان
خورش فسنجان گیاهی (بدون گوشت) پرروغن رستورانی|Fesenjan stew vegetarian, rich restaurant-style|167|4.4|10|12.2|فسنجون;خورش فسنجان بدون گوشت;وگان
خورش فسنجان کم‌گردو با مرغ|Light-walnut fesenjan stew with chicken|136|7.8|10|7.2|خورش فسنجان کم‌گردو مرغ
خورش فسنجان کم‌گردو با مرغ کم‌روغن|Light-walnut fesenjan stew with chicken, low-oil|114|7.8|10|4.8|خورش فسنجان کم‌گردو مرغ
خورش فسنجان کم‌گردو با مرغ پرروغن رستورانی|Light-walnut fesenjan stew with chicken, rich restaurant-style|165|7.8|10|10.4|خورش فسنجان کم‌گردو مرغ
خورش فسنجان کم‌گردو با ران مرغ|Light-walnut fesenjan stew with chicken thigh|145|7.2|10|8.5|خورش فسنجان کم‌گردو ران مرغ
خورش فسنجان کم‌گردو با گوشت گوسفندی|Light-walnut fesenjan stew with lamb|160|7.4|10|10|خورش فسنجان کم‌گردو گوشت گوسفند;گوسفندی
خورش فسنجان کم‌گردو با گوشت گوسفندی کم‌روغن|Light-walnut fesenjan stew with lamb, low-oil|138|7.4|10|7.6|خورش فسنجان کم‌گردو گوشت گوسفند;گوسفندی
خورش فسنجان کم‌گردو با گوشت گوسفندی پرروغن رستورانی|Light-walnut fesenjan stew with lamb, rich restaurant-style|188|7.4|10|13.2|خورش فسنجان کم‌گردو گوشت گوسفند;گوسفندی
خورش فسنجان کم‌گردو با گوشت گاو|Light-walnut fesenjan stew with beef|148|8|10|8.4|خورش فسنجان کم‌گردو گوشت گاو;گوساله
خورش فسنجان کم‌گردو با گوشت گاو کم‌روغن|Light-walnut fesenjan stew with beef, low-oil|126|8|10|6|خورش فسنجان کم‌گردو گوشت گاو;گوساله
خورش فسنجان کم‌گردو با گوشت گاو پرروغن رستورانی|Light-walnut fesenjan stew with beef, rich restaurant-style|176|8|10|11.6|خورش فسنجان کم‌گردو گوشت گاو;گوساله
خورش فسنجان کم‌گردو گیاهی (بدون گوشت)|Light-walnut fesenjan stew vegetarian|108|3.4|10|6|خورش فسنجان کم‌گردو بدون گوشت;وگان
خورش فسنجان کم‌گردو گیاهی (بدون گوشت) کم‌روغن|Light-walnut fesenjan stew vegetarian, low-oil|86|3.4|10|3.6|خورش فسنجان کم‌گردو بدون گوشت;وگان
خورش فسنجان کم‌گردو گیاهی (بدون گوشت) پرروغن رستورانی|Light-walnut fesenjan stew vegetarian, rich restaurant-style|136|3.4|10|9.2|خورش فسنجان کم‌گردو بدون گوشت;وگان
خورش کرفس با مرغ کم‌روغن|Celery khoresh stew with chicken, low-oil|68|6.8|4|2.8|قورمه کرفس;خورش کرفس مرغ
خورش کرفس با مرغ پرروغن رستورانی|Celery khoresh stew with chicken, rich restaurant-style|119|6.8|4|8.4|قورمه کرفس;خورش کرفس مرغ
خورش کرفس با ران مرغ|Celery khoresh stew with chicken thigh|99|6.2|4|6.5|قورمه کرفس;خورش کرفس ران مرغ
خورش کرفس با گوشت گوسفندی|Celery khoresh stew with lamb|114|6.4|4|8|قورمه کرفس;خورش کرفس گوشت گوسفند;گوسفندی
خورش کرفس با گوشت گوسفندی کم‌روغن|Celery khoresh stew with lamb, low-oil|92|6.4|4|5.6|قورمه کرفس;خورش کرفس گوشت گوسفند;گوسفندی
خورش کرفس با گوشت گوسفندی پرروغن رستورانی|Celery khoresh stew with lamb, rich restaurant-style|142|6.4|4|11.2|قورمه کرفس;خورش کرفس گوشت گوسفند;گوسفندی
خورش کرفس با گوشت گاو|Celery khoresh stew with beef|102|7|4|6.4|قورمه کرفس;خورش کرفس گوشت گاو;گوساله
خورش کرفس با گوشت گاو کم‌روغن|Celery khoresh stew with beef, low-oil|80|7|4|4|قورمه کرفس;خورش کرفس گوشت گاو;گوساله
خورش کرفس با گوشت گاو پرروغن رستورانی|Celery khoresh stew with beef, rich restaurant-style|130|7|4|9.6|قورمه کرفس;خورش کرفس گوشت گاو;گوساله
خورش کرفس گیاهی (بدون گوشت)|Celery khoresh stew vegetarian|62|2.4|4|4|قورمه کرفس;خورش کرفس بدون گوشت;وگان
خورش کرفس گیاهی (بدون گوشت) کم‌روغن|Celery khoresh stew vegetarian, low-oil|40|2.4|4|1.6|قورمه کرفس;خورش کرفس بدون گوشت;وگان
خورش کرفس گیاهی (بدون گوشت) پرروغن رستورانی|Celery khoresh stew vegetarian, rich restaurant-style|90|2.4|4|7.2|قورمه کرفس;خورش کرفس بدون گوشت;وگان
خورش آلو اسفناج با مرغ|Plum spinach stew with chicken|116|7.3|10|5.2|خورش آلو اسفناج مرغ
خورش آلو اسفناج با مرغ کم‌روغن|Plum spinach stew with chicken, low-oil|94|7.3|10|2.8|خورش آلو اسفناج مرغ
خورش آلو اسفناج با مرغ پرروغن رستورانی|Plum spinach stew with chicken, rich restaurant-style|145|7.3|10|8.4|خورش آلو اسفناج مرغ
خورش آلو اسفناج با ران مرغ|Plum spinach stew with chicken thigh|125|6.7|10|6.5|خورش آلو اسفناج ران مرغ
خورش آلو اسفناج با گوشت گوسفندی|Plum spinach stew with lamb|140|6.9|10|8|خورش آلو اسفناج گوشت گوسفند;گوسفندی
خورش آلو اسفناج با گوشت گوسفندی کم‌روغن|Plum spinach stew with lamb, low-oil|118|6.9|10|5.6|خورش آلو اسفناج گوشت گوسفند;گوسفندی
خورش آلو اسفناج با گوشت گوسفندی پرروغن رستورانی|Plum spinach stew with lamb, rich restaurant-style|168|6.9|10|11.2|خورش آلو اسفناج گوشت گوسفند;گوسفندی
خورش آلو اسفناج با گوشت گاو|Plum spinach stew with beef|128|7.5|10|6.4|خورش آلو اسفناج گوشت گاو;گوساله
خورش آلو اسفناج با گوشت گاو کم‌روغن|Plum spinach stew with beef, low-oil|106|7.5|10|4|خورش آلو اسفناج گوشت گاو;گوساله
خورش آلو اسفناج با گوشت گاو پرروغن رستورانی|Plum spinach stew with beef, rich restaurant-style|156|7.5|10|9.6|خورش آلو اسفناج گوشت گاو;گوساله
خورش آلو اسفناج گیاهی (بدون گوشت)|Plum spinach stew vegetarian|88|2.9|10|4|خورش آلو اسفناج بدون گوشت;وگان
خورش آلو اسفناج گیاهی (بدون گوشت) کم‌روغن|Plum spinach stew vegetarian, low-oil|66|2.9|10|1.6|خورش آلو اسفناج بدون گوشت;وگان
خورش آلو اسفناج گیاهی (بدون گوشت) پرروغن رستورانی|Plum spinach stew vegetarian, rich restaurant-style|116|2.9|10|7.2|خورش آلو اسفناج بدون گوشت;وگان
خورش بامیه با مرغ|Okra stew with chicken|103|6.8|6|5.7|خورش بامیه مرغ
خورش بامیه با مرغ کم‌روغن|Okra stew with chicken, low-oil|81|6.8|6|3.3|خورش بامیه مرغ
خورش بامیه با مرغ پرروغن رستورانی|Okra stew with chicken, rich restaurant-style|131|6.8|6|8.9|خورش بامیه مرغ
خورش بامیه با ران مرغ|Okra stew with chicken thigh|112|6.2|6|7|خورش بامیه ران مرغ
خورش بامیه با گوشت گوسفندی|Okra stew with lamb|126|6.4|6|8.5|خورش بامیه گوشت گوسفند;گوسفندی
خورش بامیه با گوشت گوسفندی کم‌روغن|Okra stew with lamb, low-oil|105|6.4|6|6.1|خورش بامیه گوشت گوسفند;گوسفندی
خورش بامیه با گوشت گوسفندی پرروغن رستورانی|Okra stew with lamb, rich restaurant-style|155|6.4|6|11.7|خورش بامیه گوشت گوسفند;گوسفندی
خورش بامیه با گوشت گاو|Okra stew with beef|114|7|6|6.9|خورش بامیه گوشت گاو;گوساله
خورش بامیه با گوشت گاو کم‌روغن|Okra stew with beef, low-oil|93|7|6|4.5|خورش بامیه گوشت گاو;گوساله
خورش بامیه با گوشت گاو پرروغن رستورانی|Okra stew with beef, rich restaurant-style|143|7|6|10.1|خورش بامیه گوشت گاو;گوساله
خورش بامیه گیاهی (بدون گوشت)|Okra stew vegetarian|74|2.4|6|4.5|خورش بامیه بدون گوشت;وگان
خورش بامیه گیاهی (بدون گوشت) کم‌روغن|Okra stew vegetarian, low-oil|53|2.4|6|2.1|خورش بامیه بدون گوشت;وگان
خورش بامیه گیاهی (بدون گوشت) پرروغن رستورانی|Okra stew vegetarian, rich restaurant-style|103|2.4|6|7.7|خورش بامیه بدون گوشت;وگان
خورش لوبیا سبز با مرغ|Green bean stew with chicken|98|6.8|6|5.2|خورش لوبیا;خورش لوبیا سبز مرغ
خورش لوبیا سبز با مرغ کم‌روغن|Green bean stew with chicken, low-oil|76|6.8|6|2.8|خورش لوبیا;خورش لوبیا سبز مرغ
خورش لوبیا سبز با مرغ پرروغن رستورانی|Green bean stew with chicken, rich restaurant-style|127|6.8|6|8.4|خورش لوبیا;خورش لوبیا سبز مرغ
خورش لوبیا سبز با ران مرغ|Green bean stew with chicken thigh|107|6.2|6|6.5|خورش لوبیا;خورش لوبیا سبز ران مرغ
خورش لوبیا سبز با گوشت گوسفندی|Green bean stew with lamb|122|6.4|6|8|خورش لوبیا;خورش لوبیا سبز گوشت گوسفند;گوسفندی
خورش لوبیا سبز با گوشت گوسفندی کم‌روغن|Green bean stew with lamb, low-oil|100|6.4|6|5.6|خورش لوبیا;خورش لوبیا سبز گوشت گوسفند;گوسفندی
خورش لوبیا سبز با گوشت گوسفندی پرروغن رستورانی|Green bean stew with lamb, rich restaurant-style|150|6.4|6|11.2|خورش لوبیا;خورش لوبیا سبز گوشت گوسفند;گوسفندی
خورش لوبیا سبز با گوشت گاو|Green bean stew with beef|110|7|6|6.4|خورش لوبیا;خورش لوبیا سبز گوشت گاو;گوساله
خورش لوبیا سبز با گوشت گاو کم‌روغن|Green bean stew with beef, low-oil|88|7|6|4|خورش لوبیا;خورش لوبیا سبز گوشت گاو;گوساله
خورش لوبیا سبز با گوشت گاو پرروغن رستورانی|Green bean stew with beef, rich restaurant-style|138|7|6|9.6|خورش لوبیا;خورش لوبیا سبز گوشت گاو;گوساله
خورش لوبیا سبز گیاهی (بدون گوشت)|Green bean stew vegetarian|70|2.4|6|4|خورش لوبیا;خورش لوبیا سبز بدون گوشت;وگان
خورش لوبیا سبز گیاهی (بدون گوشت) کم‌روغن|Green bean stew vegetarian, low-oil|48|2.4|6|1.6|خورش لوبیا;خورش لوبیا سبز بدون گوشت;وگان
خورش لوبیا سبز گیاهی (بدون گوشت) پرروغن رستورانی|Green bean stew vegetarian, rich restaurant-style|98|2.4|6|7.2|خورش لوبیا;خورش لوبیا سبز بدون گوشت;وگان
خورش هویج با مرغ|Carrot stew with chicken|113|6.3|9|5.7|خورش هویج مرغ
خورش هویج با مرغ کم‌روغن|Carrot stew with chicken, low-oil|91|6.3|9|3.3|خورش هویج مرغ
خورش هویج با مرغ پرروغن رستورانی|Carrot stew with chicken, rich restaurant-style|141|6.3|9|8.9|خورش هویج مرغ
خورش هویج با ران مرغ|Carrot stew with chicken thigh|122|5.7|9|7|خورش هویج ران مرغ
خورش هویج با گوشت گوسفندی|Carrot stew with lamb|136|5.9|9|8.5|خورش هویج گوشت گوسفند;گوسفندی
خورش هویج با گوشت گوسفندی کم‌روغن|Carrot stew with lamb, low-oil|115|5.9|9|6.1|خورش هویج گوشت گوسفند;گوسفندی
خورش هویج با گوشت گوسفندی پرروغن رستورانی|Carrot stew with lamb, rich restaurant-style|165|5.9|9|11.7|خورش هویج گوشت گوسفند;گوسفندی
خورش هویج با گوشت گاو|Carrot stew with beef|124|6.5|9|6.9|خورش هویج گوشت گاو;گوساله
خورش هویج با گوشت گاو کم‌روغن|Carrot stew with beef, low-oil|103|6.5|9|4.5|خورش هویج گوشت گاو;گوساله
خورش هویج با گوشت گاو پرروغن رستورانی|Carrot stew with beef, rich restaurant-style|153|6.5|9|10.1|خورش هویج گوشت گاو;گوساله
خورش هویج گیاهی (بدون گوشت)|Carrot stew vegetarian|84|1.9|9|4.5|خورش هویج بدون گوشت;وگان
خورش هویج گیاهی (بدون گوشت) کم‌روغن|Carrot stew vegetarian, low-oil|63|1.9|9|2.1|خورش هویج بدون گوشت;وگان
خورش هویج گیاهی (بدون گوشت) پرروغن رستورانی|Carrot stew vegetarian, rich restaurant-style|113|1.9|9|7.7|خورش هویج بدون گوشت;وگان
خورش به با مرغ|Quince stew with chicken|120|6.3|12|5.2|خورش به;خورش به مرغ
خورش به با مرغ کم‌روغن|Quince stew with chicken, low-oil|98|6.3|12|2.8|خورش به;خورش به مرغ
خورش به با مرغ پرروغن رستورانی|Quince stew with chicken, rich restaurant-style|149|6.3|12|8.4|خورش به;خورش به مرغ
خورش به با ران مرغ|Quince stew with chicken thigh|129|5.7|12|6.5|خورش به;خورش به ران مرغ
خورش به با گوشت گوسفندی|Quince stew with lamb|144|5.9|12|8|خورش به;خورش به گوشت گوسفند;گوسفندی
خورش به با گوشت گوسفندی کم‌روغن|Quince stew with lamb, low-oil|122|5.9|12|5.6|خورش به;خورش به گوشت گوسفند;گوسفندی
خورش به با گوشت گوسفندی پرروغن رستورانی|Quince stew with lamb, rich restaurant-style|172|5.9|12|11.2|خورش به;خورش به گوشت گوسفند;گوسفندی
خورش به با گوشت گاو|Quince stew with beef|132|6.5|12|6.4|خورش به;خورش به گوشت گاو;گوساله
خورش به با گوشت گاو کم‌روغن|Quince stew with beef, low-oil|110|6.5|12|4|خورش به;خورش به گوشت گاو;گوساله
خورش به با گوشت گاو پرروغن رستورانی|Quince stew with beef, rich restaurant-style|160|6.5|12|9.6|خورش به;خورش به گوشت گاو;گوساله
خورش به گیاهی (بدون گوشت)|Quince stew vegetarian|92|1.9|12|4|خورش به;خورش به بدون گوشت;وگان
خورش به گیاهی (بدون گوشت) کم‌روغن|Quince stew vegetarian, low-oil|70|1.9|12|1.6|خورش به;خورش به بدون گوشت;وگان
خورش به گیاهی (بدون گوشت) پرروغن رستورانی|Quince stew vegetarian, rich restaurant-style|120|1.9|12|7.2|خورش به;خورش به بدون گوشت;وگان
خورش انار با مرغ|Pomegranate stew with chicken|131|6.8|12|6.2|انار خورش;خورش انار مرغ
خورش انار با مرغ کم‌روغن|Pomegranate stew with chicken, low-oil|109|6.8|12|3.8|انار خورش;خورش انار مرغ
خورش انار با مرغ پرروغن رستورانی|Pomegranate stew with chicken, rich restaurant-style|160|6.8|12|9.4|انار خورش;خورش انار مرغ
خورش انار با ران مرغ|Pomegranate stew with chicken thigh|140|6.2|12|7.5|انار خورش;خورش انار ران مرغ
خورش انار با گوشت گوسفندی|Pomegranate stew with lamb|155|6.4|12|9|انار خورش;خورش انار گوشت گوسفند;گوسفندی
خورش انار با گوشت گوسفندی کم‌روغن|Pomegranate stew with lamb, low-oil|133|6.4|12|6.6|انار خورش;خورش انار گوشت گوسفند;گوسفندی
خورش انار با گوشت گوسفندی پرروغن رستورانی|Pomegranate stew with lamb, rich restaurant-style|183|6.4|12|12.2|انار خورش;خورش انار گوشت گوسفند;گوسفندی
خورش انار با گوشت گاو|Pomegranate stew with beef|143|7|12|7.4|انار خورش;خورش انار گوشت گاو;گوساله
خورش انار با گوشت گاو کم‌روغن|Pomegranate stew with beef, low-oil|121|7|12|5|انار خورش;خورش انار گوشت گاو;گوساله
خورش انار با گوشت گاو پرروغن رستورانی|Pomegranate stew with beef, rich restaurant-style|171|7|12|10.6|انار خورش;خورش انار گوشت گاو;گوساله
خورش انار گیاهی (بدون گوشت)|Pomegranate stew vegetarian|103|2.4|12|5|انار خورش;خورش انار بدون گوشت;وگان
خورش انار گیاهی (بدون گوشت) کم‌روغن|Pomegranate stew vegetarian, low-oil|81|2.4|12|2.6|انار خورش;خورش انار بدون گوشت;وگان
خورش انار گیاهی (بدون گوشت) پرروغن رستورانی|Pomegranate stew vegetarian, rich restaurant-style|131|2.4|12|8.2|انار خورش;خورش انار بدون گوشت;وگان
خورش ماست با مرغ|Yogurt stew with chicken|133|8.8|6|8.2|خورش ماست اصفهانی;خورش ماست مرغ
خورش ماست با مرغ کم‌روغن|Yogurt stew with chicken, low-oil|111|8.8|6|5.8|خورش ماست اصفهانی;خورش ماست مرغ
خورش ماست با مرغ پرروغن رستورانی|Yogurt stew with chicken, rich restaurant-style|162|8.8|6|11.4|خورش ماست اصفهانی;خورش ماست مرغ
خورش ماست با ران مرغ|Yogurt stew with chicken thigh|142|8.2|6|9.5|خورش ماست اصفهانی;خورش ماست ران مرغ
خورش ماست با گوشت گوسفندی|Yogurt stew with lamb|157|8.4|6|11|خورش ماست اصفهانی;خورش ماست گوشت گوسفند;گوسفندی
خورش ماست با گوشت گوسفندی کم‌روغن|Yogurt stew with lamb, low-oil|135|8.4|6|8.6|خورش ماست اصفهانی;خورش ماست گوشت گوسفند;گوسفندی
خورش ماست با گوشت گوسفندی پرروغن رستورانی|Yogurt stew with lamb, rich restaurant-style|185|8.4|6|14.2|خورش ماست اصفهانی;خورش ماست گوشت گوسفند;گوسفندی
خورش ماست با گوشت گاو|Yogurt stew with beef|145|9|6|9.4|خورش ماست اصفهانی;خورش ماست گوشت گاو;گوساله
خورش ماست با گوشت گاو کم‌روغن|Yogurt stew with beef, low-oil|123|9|6|7|خورش ماست اصفهانی;خورش ماست گوشت گاو;گوساله
خورش ماست با گوشت گاو پرروغن رستورانی|Yogurt stew with beef, rich restaurant-style|173|9|6|12.6|خورش ماست اصفهانی;خورش ماست گوشت گاو;گوساله
خورش ماست گیاهی (بدون گوشت)|Yogurt stew vegetarian|105|4.4|6|7|خورش ماست اصفهانی;خورش ماست بدون گوشت;وگان
خورش ماست گیاهی (بدون گوشت) کم‌روغن|Yogurt stew vegetarian, low-oil|83|4.4|6|4.6|خورش ماست اصفهانی;خورش ماست بدون گوشت;وگان
خورش ماست گیاهی (بدون گوشت) پرروغن رستورانی|Yogurt stew vegetarian, rich restaurant-style|133|4.4|6|10.2|خورش ماست اصفهانی;خورش ماست بدون گوشت;وگان
خورش ریواس با مرغ|Rhubarb stew with chicken|92|6.3|5|5.2|خورش ریواس مرغ
خورش ریواس با مرغ کم‌روغن|Rhubarb stew with chicken, low-oil|70|6.3|5|2.8|خورش ریواس مرغ
خورش ریواس با مرغ پرروغن رستورانی|Rhubarb stew with chicken, rich restaurant-style|121|6.3|5|8.4|خورش ریواس مرغ
خورش ریواس با ران مرغ|Rhubarb stew with chicken thigh|101|5.7|5|6.5|خورش ریواس ران مرغ
خورش ریواس با گوشت گوسفندی|Rhubarb stew with lamb|116|5.9|5|8|خورش ریواس گوشت گوسفند;گوسفندی
خورش ریواس با گوشت گوسفندی کم‌روغن|Rhubarb stew with lamb, low-oil|94|5.9|5|5.6|خورش ریواس گوشت گوسفند;گوسفندی
خورش ریواس با گوشت گوسفندی پرروغن رستورانی|Rhubarb stew with lamb, rich restaurant-style|144|5.9|5|11.2|خورش ریواس گوشت گوسفند;گوسفندی
خورش ریواس با گوشت گاو|Rhubarb stew with beef|104|6.5|5|6.4|خورش ریواس گوشت گاو;گوساله
خورش ریواس با گوشت گاو کم‌روغن|Rhubarb stew with beef, low-oil|82|6.5|5|4|خورش ریواس گوشت گاو;گوساله
خورش ریواس با گوشت گاو پرروغن رستورانی|Rhubarb stew with beef, rich restaurant-style|132|6.5|5|9.6|خورش ریواس گوشت گاو;گوساله
خورش ریواس گیاهی (بدون گوشت)|Rhubarb stew vegetarian|64|1.9|5|4|خورش ریواس بدون گوشت;وگان
خورش ریواس گیاهی (بدون گوشت) کم‌روغن|Rhubarb stew vegetarian, low-oil|42|1.9|5|1.6|خورش ریواس بدون گوشت;وگان
خورش ریواس گیاهی (بدون گوشت) پرروغن رستورانی|Rhubarb stew vegetarian, rich restaurant-style|92|1.9|5|7.2|خورش ریواس بدون گوشت;وگان
خورش کدو سبز با مرغ|Zucchini stew with chicken|92|6.3|5|5.2|خورش کدو سبز مرغ
خورش کدو سبز با مرغ کم‌روغن|Zucchini stew with chicken, low-oil|70|6.3|5|2.8|خورش کدو سبز مرغ
خورش کدو سبز با مرغ پرروغن رستورانی|Zucchini stew with chicken, rich restaurant-style|121|6.3|5|8.4|خورش کدو سبز مرغ
خورش کدو سبز با ران مرغ|Zucchini stew with chicken thigh|101|5.7|5|6.5|خورش کدو سبز ران مرغ
خورش کدو سبز با گوشت گوسفندی|Zucchini stew with lamb|116|5.9|5|8|خورش کدو سبز گوشت گوسفند;گوسفندی
خورش کدو سبز با گوشت گوسفندی کم‌روغن|Zucchini stew with lamb, low-oil|94|5.9|5|5.6|خورش کدو سبز گوشت گوسفند;گوسفندی
خورش کدو سبز با گوشت گوسفندی پرروغن رستورانی|Zucchini stew with lamb, rich restaurant-style|144|5.9|5|11.2|خورش کدو سبز گوشت گوسفند;گوسفندی
خورش کدو سبز با گوشت گاو|Zucchini stew with beef|104|6.5|5|6.4|خورش کدو سبز گوشت گاو;گوساله
خورش کدو سبز با گوشت گاو کم‌روغن|Zucchini stew with beef, low-oil|82|6.5|5|4|خورش کدو سبز گوشت گاو;گوساله
خورش کدو سبز با گوشت گاو پرروغن رستورانی|Zucchini stew with beef, rich restaurant-style|132|6.5|5|9.6|خورش کدو سبز گوشت گاو;گوساله
خورش کدو سبز گیاهی (بدون گوشت)|Zucchini stew vegetarian|64|1.9|5|4|خورش کدو سبز بدون گوشت;وگان
خورش کدو سبز گیاهی (بدون گوشت) کم‌روغن|Zucchini stew vegetarian, low-oil|42|1.9|5|1.6|خورش کدو سبز بدون گوشت;وگان
خورش کدو سبز گیاهی (بدون گوشت) پرروغن رستورانی|Zucchini stew vegetarian, rich restaurant-style|92|1.9|5|7.2|خورش کدو سبز بدون گوشت;وگان
خورش کدو حلوایی با مرغ|Pumpkin stew with chicken|112|6.3|10|5.2|خورش کدو حلوایی مرغ
خورش کدو حلوایی با مرغ کم‌روغن|Pumpkin stew with chicken, low-oil|90|6.3|10|2.8|خورش کدو حلوایی مرغ
خورش کدو حلوایی با مرغ پرروغن رستورانی|Pumpkin stew with chicken, rich restaurant-style|141|6.3|10|8.4|خورش کدو حلوایی مرغ
خورش کدو حلوایی با ران مرغ|Pumpkin stew with chicken thigh|121|5.7|10|6.5|خورش کدو حلوایی ران مرغ
خورش کدو حلوایی با گوشت گوسفندی|Pumpkin stew with lamb|136|5.9|10|8|خورش کدو حلوایی گوشت گوسفند;گوسفندی
خورش کدو حلوایی با گوشت گوسفندی کم‌روغن|Pumpkin stew with lamb, low-oil|114|5.9|10|5.6|خورش کدو حلوایی گوشت گوسفند;گوسفندی
خورش کدو حلوایی با گوشت گوسفندی پرروغن رستورانی|Pumpkin stew with lamb, rich restaurant-style|164|5.9|10|11.2|خورش کدو حلوایی گوشت گوسفند;گوسفندی
خورش کدو حلوایی با گوشت گاو|Pumpkin stew with beef|124|6.5|10|6.4|خورش کدو حلوایی گوشت گاو;گوساله
خورش کدو حلوایی با گوشت گاو کم‌روغن|Pumpkin stew with beef, low-oil|102|6.5|10|4|خورش کدو حلوایی گوشت گاو;گوساله
خورش کدو حلوایی با گوشت گاو پرروغن رستورانی|Pumpkin stew with beef, rich restaurant-style|152|6.5|10|9.6|خورش کدو حلوایی گوشت گاو;گوساله
خورش کدو حلوایی گیاهی (بدون گوشت)|Pumpkin stew vegetarian|84|1.9|10|4|خورش کدو حلوایی بدون گوشت;وگان
خورش کدو حلوایی گیاهی (بدون گوشت) کم‌روغن|Pumpkin stew vegetarian, low-oil|62|1.9|10|1.6|خورش کدو حلوایی بدون گوشت;وگان
خورش کدو حلوایی گیاهی (بدون گوشت) پرروغن رستورانی|Pumpkin stew vegetarian, rich restaurant-style|112|1.9|10|7.2|خورش کدو حلوایی بدون گوشت;وگان
خورش گوجه سبز با مرغ|Green plum stew with chicken|104|6.3|8|5.2|خورش گوجه سبز مرغ
خورش گوجه سبز با مرغ کم‌روغن|Green plum stew with chicken, low-oil|82|6.3|8|2.8|خورش گوجه سبز مرغ
خورش گوجه سبز با مرغ پرروغن رستورانی|Green plum stew with chicken, rich restaurant-style|133|6.3|8|8.4|خورش گوجه سبز مرغ
خورش گوجه سبز با ران مرغ|Green plum stew with chicken thigh|113|5.7|8|6.5|خورش گوجه سبز ران مرغ
خورش گوجه سبز با گوشت گوسفندی|Green plum stew with lamb|128|5.9|8|8|خورش گوجه سبز گوشت گوسفند;گوسفندی
خورش گوجه سبز با گوشت گوسفندی کم‌روغن|Green plum stew with lamb, low-oil|106|5.9|8|5.6|خورش گوجه سبز گوشت گوسفند;گوسفندی
خورش گوجه سبز با گوشت گوسفندی پرروغن رستورانی|Green plum stew with lamb, rich restaurant-style|156|5.9|8|11.2|خورش گوجه سبز گوشت گوسفند;گوسفندی
خورش گوجه سبز با گوشت گاو|Green plum stew with beef|116|6.5|8|6.4|خورش گوجه سبز گوشت گاو;گوساله
خورش گوجه سبز با گوشت گاو کم‌روغن|Green plum stew with beef, low-oil|94|6.5|8|4|خورش گوجه سبز گوشت گاو;گوساله
خورش گوجه سبز با گوشت گاو پرروغن رستورانی|Green plum stew with beef, rich restaurant-style|144|6.5|8|9.6|خورش گوجه سبز گوشت گاو;گوساله
خورش گوجه سبز گیاهی (بدون گوشت)|Green plum stew vegetarian|76|1.9|8|4|خورش گوجه سبز بدون گوشت;وگان
خورش گوجه سبز گیاهی (بدون گوشت) کم‌روغن|Green plum stew vegetarian, low-oil|54|1.9|8|1.6|خورش گوجه سبز بدون گوشت;وگان
خورش گوجه سبز گیاهی (بدون گوشت) پرروغن رستورانی|Green plum stew vegetarian, rich restaurant-style|104|1.9|8|7.2|خورش گوجه سبز بدون گوشت;وگان
خورش آلبالو با مرغ|Sour cherry stew with chicken|116|6.3|11|5.2|خورش آلبالو مرغ
خورش آلبالو با مرغ کم‌روغن|Sour cherry stew with chicken, low-oil|94|6.3|11|2.8|خورش آلبالو مرغ
خورش آلبالو با مرغ پرروغن رستورانی|Sour cherry stew with chicken, rich restaurant-style|145|6.3|11|8.4|خورش آلبالو مرغ
خورش آلبالو با ران مرغ|Sour cherry stew with chicken thigh|125|5.7|11|6.5|خورش آلبالو ران مرغ
خورش آلبالو با گوشت گوسفندی|Sour cherry stew with lamb|140|5.9|11|8|خورش آلبالو گوشت گوسفند;گوسفندی
خورش آلبالو با گوشت گوسفندی کم‌روغن|Sour cherry stew with lamb, low-oil|118|5.9|11|5.6|خورش آلبالو گوشت گوسفند;گوسفندی
خورش آلبالو با گوشت گوسفندی پرروغن رستورانی|Sour cherry stew with lamb, rich restaurant-style|168|5.9|11|11.2|خورش آلبالو گوشت گوسفند;گوسفندی
خورش آلبالو با گوشت گاو|Sour cherry stew with beef|128|6.5|11|6.4|خورش آلبالو گوشت گاو;گوساله
خورش آلبالو با گوشت گاو کم‌روغن|Sour cherry stew with beef, low-oil|106|6.5|11|4|خورش آلبالو گوشت گاو;گوساله
خورش آلبالو با گوشت گاو پرروغن رستورانی|Sour cherry stew with beef, rich restaurant-style|156|6.5|11|9.6|خورش آلبالو گوشت گاو;گوساله
خورش آلبالو گیاهی (بدون گوشت)|Sour cherry stew vegetarian|88|1.9|11|4|خورش آلبالو بدون گوشت;وگان
خورش آلبالو گیاهی (بدون گوشت) کم‌روغن|Sour cherry stew vegetarian, low-oil|66|1.9|11|1.6|خورش آلبالو بدون گوشت;وگان
خورش آلبالو گیاهی (بدون گوشت) پرروغن رستورانی|Sour cherry stew vegetarian, rich restaurant-style|116|1.9|11|7.2|خورش آلبالو بدون گوشت;وگان
خورش خلال با مرغ|Khalal almond sliver stew with chicken|137|7.8|8|8.2|خورش خلال مرغ
خورش خلال با مرغ کم‌روغن|Khalal almond sliver stew with chicken, low-oil|115|7.8|8|5.8|خورش خلال مرغ
خورش خلال با مرغ پرروغن رستورانی|Khalal almond sliver stew with chicken, rich restaurant-style|166|7.8|8|11.4|خورش خلال مرغ
خورش خلال با ران مرغ|Khalal almond sliver stew with chicken thigh|146|7.2|8|9.5|خورش خلال ران مرغ
خورش خلال با گوشت گوسفندی|Khalal almond sliver stew with lamb|161|7.4|8|11|خورش خلال گوشت گوسفند;گوسفندی
خورش خلال با گوشت گوسفندی کم‌روغن|Khalal almond sliver stew with lamb, low-oil|139|7.4|8|8.6|خورش خلال گوشت گوسفند;گوسفندی
خورش خلال با گوشت گوسفندی پرروغن رستورانی|Khalal almond sliver stew with lamb, rich restaurant-style|189|7.4|8|14.2|خورش خلال گوشت گوسفند;گوسفندی
خورش خلال با گوشت گاو|Khalal almond sliver stew with beef|149|8|8|9.4|خورش خلال گوشت گاو;گوساله
خورش خلال با گوشت گاو کم‌روغن|Khalal almond sliver stew with beef, low-oil|127|8|8|7|خورش خلال گوشت گاو;گوساله
خورش خلال با گوشت گاو پرروغن رستورانی|Khalal almond sliver stew with beef, rich restaurant-style|177|8|8|12.6|خورش خلال گوشت گاو;گوساله
خورش خلال گیاهی (بدون گوشت)|Khalal almond sliver stew vegetarian|109|3.4|8|7|خورش خلال بدون گوشت;وگان
خورش خلال گیاهی (بدون گوشت) کم‌روغن|Khalal almond sliver stew vegetarian, low-oil|87|3.4|8|4.6|خورش خلال بدون گوشت;وگان
خورش خلال گیاهی (بدون گوشت) پرروغن رستورانی|Khalal almond sliver stew vegetarian, rich restaurant-style|137|3.4|8|10.2|خورش خلال بدون گوشت;وگان
خورش اسفناج با مرغ|Spinach stew with chicken|94|7.8|4|5.2|خورش اسفناج مرغ
خورش اسفناج با مرغ کم‌روغن|Spinach stew with chicken, low-oil|72|7.8|4|2.8|خورش اسفناج مرغ
خورش اسفناج با مرغ پرروغن رستورانی|Spinach stew with chicken, rich restaurant-style|123|7.8|4|8.4|خورش اسفناج مرغ
خورش اسفناج با ران مرغ|Spinach stew with chicken thigh|103|7.2|4|6.5|خورش اسفناج ران مرغ
خورش اسفناج با گوشت گوسفندی|Spinach stew with lamb|118|7.4|4|8|خورش اسفناج گوشت گوسفند;گوسفندی
خورش اسفناج با گوشت گوسفندی کم‌روغن|Spinach stew with lamb, low-oil|96|7.4|4|5.6|خورش اسفناج گوشت گوسفند;گوسفندی
خورش اسفناج با گوشت گوسفندی پرروغن رستورانی|Spinach stew with lamb, rich restaurant-style|146|7.4|4|11.2|خورش اسفناج گوشت گوسفند;گوسفندی
خورش اسفناج با گوشت گاو|Spinach stew with beef|106|8|4|6.4|خورش اسفناج گوشت گاو;گوساله
خورش اسفناج با گوشت گاو کم‌روغن|Spinach stew with beef, low-oil|84|8|4|4|خورش اسفناج گوشت گاو;گوساله
خورش اسفناج با گوشت گاو پرروغن رستورانی|Spinach stew with beef, rich restaurant-style|134|8|4|9.6|خورش اسفناج گوشت گاو;گوساله
خورش اسفناج گیاهی (بدون گوشت)|Spinach stew vegetarian|66|3.4|4|4|خورش اسفناج بدون گوشت;وگان
خورش اسفناج گیاهی (بدون گوشت) کم‌روغن|Spinach stew vegetarian, low-oil|44|3.4|4|1.6|خورش اسفناج بدون گوشت;وگان
خورش اسفناج گیاهی (بدون گوشت) پرروغن رستورانی|Spinach stew vegetarian, rich restaurant-style|94|3.4|4|7.2|خورش اسفناج بدون گوشت;وگان
خورش نخود فرنگی با مرغ|Green pea stew with chicken|116|8.3|9|5.2|خورش نخود فرنگی مرغ
خورش نخود فرنگی با مرغ کم‌روغن|Green pea stew with chicken, low-oil|94|8.3|9|2.8|خورش نخود فرنگی مرغ
خورش نخود فرنگی با مرغ پرروغن رستورانی|Green pea stew with chicken, rich restaurant-style|145|8.3|9|8.4|خورش نخود فرنگی مرغ
خورش نخود فرنگی با ران مرغ|Green pea stew with chicken thigh|125|7.7|9|6.5|خورش نخود فرنگی ران مرغ
خورش نخود فرنگی با گوشت گوسفندی|Green pea stew with lamb|140|7.9|9|8|خورش نخود فرنگی گوشت گوسفند;گوسفندی
خورش نخود فرنگی با گوشت گوسفندی کم‌روغن|Green pea stew with lamb, low-oil|118|7.9|9|5.6|خورش نخود فرنگی گوشت گوسفند;گوسفندی
خورش نخود فرنگی با گوشت گوسفندی پرروغن رستورانی|Green pea stew with lamb, rich restaurant-style|168|7.9|9|11.2|خورش نخود فرنگی گوشت گوسفند;گوسفندی
خورش نخود فرنگی با گوشت گاو|Green pea stew with beef|128|8.5|9|6.4|خورش نخود فرنگی گوشت گاو;گوساله
خورش نخود فرنگی با گوشت گاو کم‌روغن|Green pea stew with beef, low-oil|106|8.5|9|4|خورش نخود فرنگی گوشت گاو;گوساله
خورش نخود فرنگی با گوشت گاو پرروغن رستورانی|Green pea stew with beef, rich restaurant-style|156|8.5|9|9.6|خورش نخود فرنگی گوشت گاو;گوساله
خورش نخود فرنگی گیاهی (بدون گوشت)|Green pea stew vegetarian|88|3.9|9|4|خورش نخود فرنگی بدون گوشت;وگان
خورش نخود فرنگی گیاهی (بدون گوشت) کم‌روغن|Green pea stew vegetarian, low-oil|66|3.9|9|1.6|خورش نخود فرنگی بدون گوشت;وگان
خورش نخود فرنگی گیاهی (بدون گوشت) پرروغن رستورانی|Green pea stew vegetarian, rich restaurant-style|116|3.9|9|7.2|خورش نخود فرنگی بدون گوشت;وگان
خورش کنگر با مرغ کم‌روغن|Artichoke stew with chicken, low-oil|83|7.3|6|3.3|خورش کنگر مرغ
خورش کنگر با مرغ پرروغن رستورانی|Artichoke stew with chicken, rich restaurant-style|133|7.3|6|8.9|خورش کنگر مرغ
خورش کنگر با ران مرغ|Artichoke stew with chicken thigh|114|6.7|6|7|خورش کنگر ران مرغ
خورش کنگر با گوشت گوسفندی|Artichoke stew with lamb|128|6.9|6|8.5|خورش کنگر گوشت گوسفند;گوسفندی
خورش کنگر با گوشت گوسفندی کم‌روغن|Artichoke stew with lamb, low-oil|107|6.9|6|6.1|خورش کنگر گوشت گوسفند;گوسفندی
خورش کنگر با گوشت گوسفندی پرروغن رستورانی|Artichoke stew with lamb, rich restaurant-style|157|6.9|6|11.7|خورش کنگر گوشت گوسفند;گوسفندی
خورش کنگر با گوشت گاو|Artichoke stew with beef|116|7.5|6|6.9|خورش کنگر گوشت گاو;گوساله
خورش کنگر با گوشت گاو کم‌روغن|Artichoke stew with beef, low-oil|95|7.5|6|4.5|خورش کنگر گوشت گاو;گوساله
خورش کنگر با گوشت گاو پرروغن رستورانی|Artichoke stew with beef, rich restaurant-style|145|7.5|6|10.1|خورش کنگر گوشت گاو;گوساله
خورش کنگر گیاهی (بدون گوشت)|Artichoke stew vegetarian|76|2.9|6|4.5|خورش کنگر بدون گوشت;وگان
خورش کنگر گیاهی (بدون گوشت) کم‌روغن|Artichoke stew vegetarian, low-oil|55|2.9|6|2.1|خورش کنگر بدون گوشت;وگان
خورش کنگر گیاهی (بدون گوشت) پرروغن رستورانی|Artichoke stew vegetarian, rich restaurant-style|105|2.9|6|7.7|خورش کنگر بدون گوشت;وگان
خورش چغاله بادام با مرغ|Green almond stew with chicken|98|6.8|6|5.2|غوره بادام;خورش چغاله بادام مرغ
خورش چغاله بادام با مرغ کم‌روغن|Green almond stew with chicken, low-oil|76|6.8|6|2.8|غوره بادام;خورش چغاله بادام مرغ
خورش چغاله بادام با مرغ پرروغن رستورانی|Green almond stew with chicken, rich restaurant-style|127|6.8|6|8.4|غوره بادام;خورش چغاله بادام مرغ
خورش چغاله بادام با ران مرغ|Green almond stew with chicken thigh|107|6.2|6|6.5|غوره بادام;خورش چغاله بادام ران مرغ
خورش چغاله بادام با گوشت گوسفندی|Green almond stew with lamb|122|6.4|6|8|غوره بادام;خورش چغاله بادام گوشت گوسفند;گوسفندی
خورش چغاله بادام با گوشت گوسفندی کم‌روغن|Green almond stew with lamb, low-oil|100|6.4|6|5.6|غوره بادام;خورش چغاله بادام گوشت گوسفند;گوسفندی
خورش چغاله بادام با گوشت گوسفندی پرروغن رستورانی|Green almond stew with lamb, rich restaurant-style|150|6.4|6|11.2|غوره بادام;خورش چغاله بادام گوشت گوسفند;گوسفندی
خورش چغاله بادام با گوشت گاو|Green almond stew with beef|110|7|6|6.4|غوره بادام;خورش چغاله بادام گوشت گاو;گوساله
خورش چغاله بادام با گوشت گاو کم‌روغن|Green almond stew with beef, low-oil|88|7|6|4|غوره بادام;خورش چغاله بادام گوشت گاو;گوساله
خورش چغاله بادام با گوشت گاو پرروغن رستورانی|Green almond stew with beef, rich restaurant-style|138|7|6|9.6|غوره بادام;خورش چغاله بادام گوشت گاو;گوساله
خورش چغاله بادام گیاهی (بدون گوشت)|Green almond stew vegetarian|70|2.4|6|4|غوره بادام;خورش چغاله بادام بدون گوشت;وگان
خورش چغاله بادام گیاهی (بدون گوشت) کم‌روغن|Green almond stew vegetarian, low-oil|48|2.4|6|1.6|غوره بادام;خورش چغاله بادام بدون گوشت;وگان
خورش چغاله بادام گیاهی (بدون گوشت) پرروغن رستورانی|Green almond stew vegetarian, rich restaurant-style|98|2.4|6|7.2|غوره بادام;خورش چغاله بادام بدون گوشت;وگان
خورش تره با مرغ|Chives tareh stew with chicken|101|7.3|5|5.7|خورش تره مرغ
خورش تره با مرغ کم‌روغن|Chives tareh stew with chicken, low-oil|79|7.3|5|3.3|خورش تره مرغ
خورش تره با مرغ پرروغن رستورانی|Chives tareh stew with chicken, rich restaurant-style|129|7.3|5|8.9|خورش تره مرغ
خورش تره با ران مرغ|Chives tareh stew with chicken thigh|110|6.7|5|7|خورش تره ران مرغ
خورش تره با گوشت گوسفندی|Chives tareh stew with lamb|124|6.9|5|8.5|خورش تره گوشت گوسفند;گوسفندی
خورش تره با گوشت گوسفندی کم‌روغن|Chives tareh stew with lamb, low-oil|103|6.9|5|6.1|خورش تره گوشت گوسفند;گوسفندی
خورش تره با گوشت گوسفندی پرروغن رستورانی|Chives tareh stew with lamb, rich restaurant-style|153|6.9|5|11.7|خورش تره گوشت گوسفند;گوسفندی
خورش تره با گوشت گاو|Chives tareh stew with beef|112|7.5|5|6.9|خورش تره گوشت گاو;گوساله
خورش تره با گوشت گاو کم‌روغن|Chives tareh stew with beef, low-oil|91|7.5|5|4.5|خورش تره گوشت گاو;گوساله
خورش تره با گوشت گاو پرروغن رستورانی|Chives tareh stew with beef, rich restaurant-style|141|7.5|5|10.1|خورش تره گوشت گاو;گوساله
خورش تره گیاهی (بدون گوشت)|Chives tareh stew vegetarian|72|2.9|5|4.5|خورش تره بدون گوشت;وگان
خورش تره گیاهی (بدون گوشت) کم‌روغن|Chives tareh stew vegetarian, low-oil|51|2.9|5|2.1|خورش تره بدون گوشت;وگان
خورش تره گیاهی (بدون گوشت) پرروغن رستورانی|Chives tareh stew vegetarian, rich restaurant-style|101|2.9|5|7.7|خورش تره بدون گوشت;وگان
خورش شلغم با مرغ|Turnip stew with chicken|100|6.3|7|5.2|خورش شلغم مرغ
خورش شلغم با مرغ کم‌روغن|Turnip stew with chicken, low-oil|78|6.3|7|2.8|خورش شلغم مرغ
خورش شلغم با مرغ پرروغن رستورانی|Turnip stew with chicken, rich restaurant-style|129|6.3|7|8.4|خورش شلغم مرغ
خورش شلغم با ران مرغ|Turnip stew with chicken thigh|109|5.7|7|6.5|خورش شلغم ران مرغ
خورش شلغم با گوشت گوسفندی|Turnip stew with lamb|124|5.9|7|8|خورش شلغم گوشت گوسفند;گوسفندی
خورش شلغم با گوشت گوسفندی کم‌روغن|Turnip stew with lamb, low-oil|102|5.9|7|5.6|خورش شلغم گوشت گوسفند;گوسفندی
خورش شلغم با گوشت گوسفندی پرروغن رستورانی|Turnip stew with lamb, rich restaurant-style|152|5.9|7|11.2|خورش شلغم گوشت گوسفند;گوسفندی
خورش شلغم با گوشت گاو|Turnip stew with beef|112|6.5|7|6.4|خورش شلغم گوشت گاو;گوساله
خورش شلغم با گوشت گاو کم‌روغن|Turnip stew with beef, low-oil|90|6.5|7|4|خورش شلغم گوشت گاو;گوساله
خورش شلغم با گوشت گاو پرروغن رستورانی|Turnip stew with beef, rich restaurant-style|140|6.5|7|9.6|خورش شلغم گوشت گاو;گوساله
خورش شلغم گیاهی (بدون گوشت)|Turnip stew vegetarian|72|1.9|7|4|خورش شلغم بدون گوشت;وگان
خورش شلغم گیاهی (بدون گوشت) کم‌روغن|Turnip stew vegetarian, low-oil|50|1.9|7|1.6|خورش شلغم بدون گوشت;وگان
خورش شلغم گیاهی (بدون گوشت) پرروغن رستورانی|Turnip stew vegetarian, rich restaurant-style|100|1.9|7|7.2|خورش شلغم بدون گوشت;وگان
خورش پرتقال با مرغ|Orange stew with chicken|121|6.3|11|5.7|خورش پرتقال مرغ
خورش پرتقال با مرغ کم‌روغن|Orange stew with chicken, low-oil|99|6.3|11|3.3|خورش پرتقال مرغ
خورش پرتقال با مرغ پرروغن رستورانی|Orange stew with chicken, rich restaurant-style|149|6.3|11|8.9|خورش پرتقال مرغ
خورش پرتقال با ران مرغ|Orange stew with chicken thigh|130|5.7|11|7|خورش پرتقال ران مرغ
خورش پرتقال با گوشت گوسفندی|Orange stew with lamb|144|5.9|11|8.5|خورش پرتقال گوشت گوسفند;گوسفندی
خورش پرتقال با گوشت گوسفندی کم‌روغن|Orange stew with lamb, low-oil|123|5.9|11|6.1|خورش پرتقال گوشت گوسفند;گوسفندی
خورش پرتقال با گوشت گوسفندی پرروغن رستورانی|Orange stew with lamb, rich restaurant-style|173|5.9|11|11.7|خورش پرتقال گوشت گوسفند;گوسفندی
خورش پرتقال با گوشت گاو|Orange stew with beef|132|6.5|11|6.9|خورش پرتقال گوشت گاو;گوساله
خورش پرتقال با گوشت گاو کم‌روغن|Orange stew with beef, low-oil|111|6.5|11|4.5|خورش پرتقال گوشت گاو;گوساله
خورش پرتقال با گوشت گاو پرروغن رستورانی|Orange stew with beef, rich restaurant-style|161|6.5|11|10.1|خورش پرتقال گوشت گاو;گوساله
خورش پرتقال گیاهی (بدون گوشت)|Orange stew vegetarian|92|1.9|11|4.5|خورش پرتقال بدون گوشت;وگان
خورش پرتقال گیاهی (بدون گوشت) کم‌روغن|Orange stew vegetarian, low-oil|71|1.9|11|2.1|خورش پرتقال بدون گوشت;وگان
خورش پرتقال گیاهی (بدون گوشت) پرروغن رستورانی|Orange stew vegetarian, rich restaurant-style|121|1.9|11|7.7|خورش پرتقال بدون گوشت;وگان
خورش سیب با مرغ|Apple stew with chicken|120|6.3|12|5.2|خورش سیب مرغ
خورش سیب با مرغ کم‌روغن|Apple stew with chicken, low-oil|98|6.3|12|2.8|خورش سیب مرغ
خورش سیب با مرغ پرروغن رستورانی|Apple stew with chicken, rich restaurant-style|149|6.3|12|8.4|خورش سیب مرغ
خورش سیب با ران مرغ|Apple stew with chicken thigh|129|5.7|12|6.5|خورش سیب ران مرغ
خورش سیب با گوشت گوسفندی|Apple stew with lamb|144|5.9|12|8|خورش سیب گوشت گوسفند;گوسفندی
خورش سیب با گوشت گوسفندی کم‌روغن|Apple stew with lamb, low-oil|122|5.9|12|5.6|خورش سیب گوشت گوسفند;گوسفندی
خورش سیب با گوشت گوسفندی پرروغن رستورانی|Apple stew with lamb, rich restaurant-style|172|5.9|12|11.2|خورش سیب گوشت گوسفند;گوسفندی
خورش سیب با گوشت گاو|Apple stew with beef|132|6.5|12|6.4|خورش سیب گوشت گاو;گوساله
خورش سیب با گوشت گاو کم‌روغن|Apple stew with beef, low-oil|110|6.5|12|4|خورش سیب گوشت گاو;گوساله
خورش سیب با گوشت گاو پرروغن رستورانی|Apple stew with beef, rich restaurant-style|160|6.5|12|9.6|خورش سیب گوشت گاو;گوساله
خورش سیب گیاهی (بدون گوشت)|Apple stew vegetarian|92|1.9|12|4|خورش سیب بدون گوشت;وگان
خورش سیب گیاهی (بدون گوشت) کم‌روغن|Apple stew vegetarian, low-oil|70|1.9|12|1.6|خورش سیب بدون گوشت;وگان
خورش سیب گیاهی (بدون گوشت) پرروغن رستورانی|Apple stew vegetarian, rich restaurant-style|120|1.9|12|7.2|خورش سیب بدون گوشت;وگان
خورش بادمجان با مرغ کم‌روغن|Eggplant stew with chicken, low-oil|83|6.3|6|3.8|خورش بادمجان;خورش بادمجان مرغ
خورش بادمجان با مرغ پرروغن رستورانی|Eggplant stew with chicken, rich restaurant-style|134|6.3|6|9.4|خورش بادمجان;خورش بادمجان مرغ
خورش بادمجان با ران مرغ|Eggplant stew with chicken thigh|114|5.7|6|7.5|خورش بادمجان;خورش بادمجان ران مرغ
خورش بادمجان با گوشت گوسفندی|Eggplant stew with lamb|129|5.9|6|9|خورش بادمجان;خورش بادمجان گوشت گوسفند;گوسفندی
خورش بادمجان با گوشت گوسفندی کم‌روغن|Eggplant stew with lamb, low-oil|107|5.9|6|6.6|خورش بادمجان;خورش بادمجان گوشت گوسفند;گوسفندی
خورش بادمجان با گوشت گوسفندی پرروغن رستورانی|Eggplant stew with lamb, rich restaurant-style|157|5.9|6|12.2|خورش بادمجان;خورش بادمجان گوشت گوسفند;گوسفندی
خورش بادمجان با گوشت گاو|Eggplant stew with beef|117|6.5|6|7.4|خورش بادمجان;خورش بادمجان گوشت گاو;گوساله
خورش بادمجان با گوشت گاو کم‌روغن|Eggplant stew with beef, low-oil|95|6.5|6|5|خورش بادمجان;خورش بادمجان گوشت گاو;گوساله
خورش بادمجان با گوشت گاو پرروغن رستورانی|Eggplant stew with beef, rich restaurant-style|145|6.5|6|10.6|خورش بادمجان;خورش بادمجان گوشت گاو;گوساله
خورش بادمجان گیاهی (بدون گوشت)|Eggplant stew vegetarian|77|1.9|6|5|خورش بادمجان;خورش بادمجان بدون گوشت;وگان
خورش بادمجان گیاهی (بدون گوشت) کم‌روغن|Eggplant stew vegetarian, low-oil|55|1.9|6|2.6|خورش بادمجان;خورش بادمجان بدون گوشت;وگان
خورش بادمجان گیاهی (بدون گوشت) پرروغن رستورانی|Eggplant stew vegetarian, rich restaurant-style|105|1.9|6|8.2|خورش بادمجان;خورش بادمجان بدون گوشت;وگان
خورش کدو بادمجان با مرغ|Squash eggplant stew with chicken|101|6.3|6|5.7|خورش کدو بادمجان مرغ
خورش کدو بادمجان با مرغ کم‌روغن|Squash eggplant stew with chicken, low-oil|79|6.3|6|3.3|خورش کدو بادمجان مرغ
خورش کدو بادمجان با مرغ پرروغن رستورانی|Squash eggplant stew with chicken, rich restaurant-style|129|6.3|6|8.9|خورش کدو بادمجان مرغ
خورش کدو بادمجان با ران مرغ|Squash eggplant stew with chicken thigh|110|5.7|6|7|خورش کدو بادمجان ران مرغ
خورش کدو بادمجان با گوشت گوسفندی|Squash eggplant stew with lamb|124|5.9|6|8.5|خورش کدو بادمجان گوشت گوسفند;گوسفندی
خورش کدو بادمجان با گوشت گوسفندی کم‌روغن|Squash eggplant stew with lamb, low-oil|103|5.9|6|6.1|خورش کدو بادمجان گوشت گوسفند;گوسفندی
خورش کدو بادمجان با گوشت گوسفندی پرروغن رستورانی|Squash eggplant stew with lamb, rich restaurant-style|153|5.9|6|11.7|خورش کدو بادمجان گوشت گوسفند;گوسفندی
خورش کدو بادمجان با گوشت گاو|Squash eggplant stew with beef|112|6.5|6|6.9|خورش کدو بادمجان گوشت گاو;گوساله
خورش کدو بادمجان با گوشت گاو کم‌روغن|Squash eggplant stew with beef, low-oil|91|6.5|6|4.5|خورش کدو بادمجان گوشت گاو;گوساله
خورش کدو بادمجان با گوشت گاو پرروغن رستورانی|Squash eggplant stew with beef, rich restaurant-style|141|6.5|6|10.1|خورش کدو بادمجان گوشت گاو;گوساله
خورش کدو بادمجان گیاهی (بدون گوشت)|Squash eggplant stew vegetarian|72|1.9|6|4.5|خورش کدو بادمجان بدون گوشت;وگان
خورش کدو بادمجان گیاهی (بدون گوشت) کم‌روغن|Squash eggplant stew vegetarian, low-oil|51|1.9|6|2.1|خورش کدو بادمجان بدون گوشت;وگان
خورش کدو بادمجان گیاهی (بدون گوشت) پرروغن رستورانی|Squash eggplant stew vegetarian, rich restaurant-style|101|1.9|6|7.7|خورش کدو بادمجان بدون گوشت;وگان
خورش مسما با مرغ|Mosama stew with chicken|115|6.8|8|6.2|خورش مسمای بادمجان;خورش مسما مرغ
خورش مسما با مرغ کم‌روغن|Mosama stew with chicken, low-oil|93|6.8|8|3.8|خورش مسمای بادمجان;خورش مسما مرغ
خورش مسما با مرغ پرروغن رستورانی|Mosama stew with chicken, rich restaurant-style|144|6.8|8|9.4|خورش مسمای بادمجان;خورش مسما مرغ
خورش مسما با ران مرغ|Mosama stew with chicken thigh|124|6.2|8|7.5|خورش مسمای بادمجان;خورش مسما ران مرغ
خورش مسما با گوشت گوسفندی|Mosama stew with lamb|139|6.4|8|9|خورش مسمای بادمجان;خورش مسما گوشت گوسفند;گوسفندی
خورش مسما با گوشت گوسفندی کم‌روغن|Mosama stew with lamb, low-oil|117|6.4|8|6.6|خورش مسمای بادمجان;خورش مسما گوشت گوسفند;گوسفندی
خورش مسما با گوشت گوسفندی پرروغن رستورانی|Mosama stew with lamb, rich restaurant-style|167|6.4|8|12.2|خورش مسمای بادمجان;خورش مسما گوشت گوسفند;گوسفندی
خورش مسما با گوشت گاو|Mosama stew with beef|127|7|8|7.4|خورش مسمای بادمجان;خورش مسما گوشت گاو;گوساله
خورش مسما با گوشت گاو کم‌روغن|Mosama stew with beef, low-oil|105|7|8|5|خورش مسمای بادمجان;خورش مسما گوشت گاو;گوساله
خورش مسما با گوشت گاو پرروغن رستورانی|Mosama stew with beef, rich restaurant-style|155|7|8|10.6|خورش مسمای بادمجان;خورش مسما گوشت گاو;گوساله
خورش مسما گیاهی (بدون گوشت)|Mosama stew vegetarian|87|2.4|8|5|خورش مسمای بادمجان;خورش مسما بدون گوشت;وگان
خورش مسما گیاهی (بدون گوشت) کم‌روغن|Mosama stew vegetarian, low-oil|65|2.4|8|2.6|خورش مسمای بادمجان;خورش مسما بدون گوشت;وگان
خورش مسما گیاهی (بدون گوشت) پرروغن رستورانی|Mosama stew vegetarian, rich restaurant-style|115|2.4|8|8.2|خورش مسمای بادمجان;خورش مسما بدون گوشت;وگان
خورش آلو با مرغ|Prune aloo stew with chicken|131|6.8|13|5.7|خورش آلو;خورش آلو مرغ
خورش آلو با مرغ کم‌روغن|Prune aloo stew with chicken, low-oil|109|6.8|13|3.3|خورش آلو;خورش آلو مرغ
خورش آلو با مرغ پرروغن رستورانی|Prune aloo stew with chicken, rich restaurant-style|159|6.8|13|8.9|خورش آلو;خورش آلو مرغ
خورش آلو با ران مرغ|Prune aloo stew with chicken thigh|140|6.2|13|7|خورش آلو;خورش آلو ران مرغ
خورش آلو با گوشت گوسفندی|Prune aloo stew with lamb|154|6.4|13|8.5|خورش آلو;خورش آلو گوشت گوسفند;گوسفندی
خورش آلو با گوشت گوسفندی کم‌روغن|Prune aloo stew with lamb, low-oil|133|6.4|13|6.1|خورش آلو;خورش آلو گوشت گوسفند;گوسفندی
خورش آلو با گوشت گوسفندی پرروغن رستورانی|Prune aloo stew with lamb, rich restaurant-style|183|6.4|13|11.7|خورش آلو;خورش آلو گوشت گوسفند;گوسفندی
خورش آلو با گوشت گاو|Prune aloo stew with beef|142|7|13|6.9|خورش آلو;خورش آلو گوشت گاو;گوساله
خورش آلو با گوشت گاو کم‌روغن|Prune aloo stew with beef, low-oil|121|7|13|4.5|خورش آلو;خورش آلو گوشت گاو;گوساله
خورش آلو با گوشت گاو پرروغن رستورانی|Prune aloo stew with beef, rich restaurant-style|171|7|13|10.1|خورش آلو;خورش آلو گوشت گاو;گوساله
خورش آلو گیاهی (بدون گوشت)|Prune aloo stew vegetarian|102|2.4|13|4.5|خورش آلو;خورش آلو بدون گوشت;وگان
خورش آلو گیاهی (بدون گوشت) کم‌روغن|Prune aloo stew vegetarian, low-oil|81|2.4|13|2.1|خورش آلو;خورش آلو بدون گوشت;وگان
خورش آلو گیاهی (بدون گوشت) پرروغن رستورانی|Prune aloo stew vegetarian, rich restaurant-style|131|2.4|13|7.7|خورش آلو;خورش آلو بدون گوشت;وگان
خورش زردآلو با مرغ|Apricot stew with chicken|131|6.8|13|5.7|خورش زردآلو;خورش زردآلو مرغ
خورش زردآلو با مرغ کم‌روغن|Apricot stew with chicken, low-oil|109|6.8|13|3.3|خورش زردآلو;خورش زردآلو مرغ
خورش زردآلو با مرغ پرروغن رستورانی|Apricot stew with chicken, rich restaurant-style|159|6.8|13|8.9|خورش زردآلو;خورش زردآلو مرغ
خورش زردآلو با ران مرغ|Apricot stew with chicken thigh|140|6.2|13|7|خورش زردآلو;خورش زردآلو ران مرغ
خورش زردآلو با گوشت گوسفندی|Apricot stew with lamb|154|6.4|13|8.5|خورش زردآلو;خورش زردآلو گوشت گوسفند;گوسفندی
خورش زردآلو با گوشت گوسفندی کم‌روغن|Apricot stew with lamb, low-oil|133|6.4|13|6.1|خورش زردآلو;خورش زردآلو گوشت گوسفند;گوسفندی
خورش زردآلو با گوشت گوسفندی پرروغن رستورانی|Apricot stew with lamb, rich restaurant-style|183|6.4|13|11.7|خورش زردآلو;خورش زردآلو گوشت گوسفند;گوسفندی
خورش زردآلو با گوشت گاو|Apricot stew with beef|142|7|13|6.9|خورش زردآلو;خورش زردآلو گوشت گاو;گوساله
خورش زردآلو با گوشت گاو کم‌روغن|Apricot stew with beef, low-oil|121|7|13|4.5|خورش زردآلو;خورش زردآلو گوشت گاو;گوساله
خورش زردآلو با گوشت گاو پرروغن رستورانی|Apricot stew with beef, rich restaurant-style|171|7|13|10.1|خورش زردآلو;خورش زردآلو گوشت گاو;گوساله
خورش زردآلو گیاهی (بدون گوشت)|Apricot stew vegetarian|102|2.4|13|4.5|خورش زردآلو;خورش زردآلو بدون گوشت;وگان
خورش زردآلو گیاهی (بدون گوشت) کم‌روغن|Apricot stew vegetarian, low-oil|81|2.4|13|2.1|خورش زردآلو;خورش زردآلو بدون گوشت;وگان
خورش زردآلو گیاهی (بدون گوشت) پرروغن رستورانی|Apricot stew vegetarian, rich restaurant-style|131|2.4|13|7.7|خورش زردآلو;خورش زردآلو بدون گوشت;وگان
خورش لیمو عمانی با مرغ|Dried lime stew with chicken|113|8.3|7|5.7|قورمه لیمو;خورش لیمو عمانی مرغ
خورش لیمو عمانی با مرغ کم‌روغن|Dried lime stew with chicken, low-oil|91|8.3|7|3.3|قورمه لیمو;خورش لیمو عمانی مرغ
خورش لیمو عمانی با مرغ پرروغن رستورانی|Dried lime stew with chicken, rich restaurant-style|141|8.3|7|8.9|قورمه لیمو;خورش لیمو عمانی مرغ
خورش لیمو عمانی با ران مرغ|Dried lime stew with chicken thigh|122|7.7|7|7|قورمه لیمو;خورش لیمو عمانی ران مرغ
خورش لیمو عمانی با گوشت گوسفندی|Dried lime stew with lamb|136|7.9|7|8.5|قورمه لیمو;خورش لیمو عمانی گوشت گوسفند;گوسفندی
خورش لیمو عمانی با گوشت گوسفندی کم‌روغن|Dried lime stew with lamb, low-oil|115|7.9|7|6.1|قورمه لیمو;خورش لیمو عمانی گوشت گوسفند;گوسفندی
خورش لیمو عمانی با گوشت گوسفندی پرروغن رستورانی|Dried lime stew with lamb, rich restaurant-style|165|7.9|7|11.7|قورمه لیمو;خورش لیمو عمانی گوشت گوسفند;گوسفندی
خورش لیمو عمانی با گوشت گاو|Dried lime stew with beef|124|8.5|7|6.9|قورمه لیمو;خورش لیمو عمانی گوشت گاو;گوساله
خورش لیمو عمانی با گوشت گاو کم‌روغن|Dried lime stew with beef, low-oil|103|8.5|7|4.5|قورمه لیمو;خورش لیمو عمانی گوشت گاو;گوساله
خورش لیمو عمانی با گوشت گاو پرروغن رستورانی|Dried lime stew with beef, rich restaurant-style|153|8.5|7|10.1|قورمه لیمو;خورش لیمو عمانی گوشت گاو;گوساله
خورش لیمو عمانی گیاهی (بدون گوشت)|Dried lime stew vegetarian|84|3.9|7|4.5|قورمه لیمو;خورش لیمو عمانی بدون گوشت;وگان
خورش لیمو عمانی گیاهی (بدون گوشت) کم‌روغن|Dried lime stew vegetarian, low-oil|63|3.9|7|2.1|قورمه لیمو;خورش لیمو عمانی بدون گوشت;وگان
خورش لیمو عمانی گیاهی (بدون گوشت) پرروغن رستورانی|Dried lime stew vegetarian, rich restaurant-style|113|3.9|7|7.7|قورمه لیمو;خورش لیمو عمانی بدون گوشت;وگان
خورش نخودچی با مرغ|Chickpea stew with chicken|120|9.3|9|5.2|خورش نخودچی مرغ
خورش نخودچی با مرغ کم‌روغن|Chickpea stew with chicken, low-oil|98|9.3|9|2.8|خورش نخودچی مرغ
خورش نخودچی با مرغ پرروغن رستورانی|Chickpea stew with chicken, rich restaurant-style|149|9.3|9|8.4|خورش نخودچی مرغ
خورش نخودچی با ران مرغ|Chickpea stew with chicken thigh|129|8.7|9|6.5|خورش نخودچی ران مرغ
خورش نخودچی با گوشت گوسفندی|Chickpea stew with lamb|144|8.9|9|8|خورش نخودچی گوشت گوسفند;گوسفندی
خورش نخودچی با گوشت گوسفندی کم‌روغن|Chickpea stew with lamb, low-oil|122|8.9|9|5.6|خورش نخودچی گوشت گوسفند;گوسفندی
خورش نخودچی با گوشت گوسفندی پرروغن رستورانی|Chickpea stew with lamb, rich restaurant-style|172|8.9|9|11.2|خورش نخودچی گوشت گوسفند;گوسفندی
خورش نخودچی با گوشت گاو|Chickpea stew with beef|132|9.5|9|6.4|خورش نخودچی گوشت گاو;گوساله
خورش نخودچی با گوشت گاو کم‌روغن|Chickpea stew with beef, low-oil|110|9.5|9|4|خورش نخودچی گوشت گاو;گوساله
خورش نخودچی با گوشت گاو پرروغن رستورانی|Chickpea stew with beef, rich restaurant-style|160|9.5|9|9.6|خورش نخودچی گوشت گاو;گوساله
خورش نخودچی گیاهی (بدون گوشت)|Chickpea stew vegetarian|92|4.9|9|4|خورش نخودچی بدون گوشت;وگان
خورش نخودچی گیاهی (بدون گوشت) کم‌روغن|Chickpea stew vegetarian, low-oil|70|4.9|9|1.6|خورش نخودچی بدون گوشت;وگان
خورش نخودچی گیاهی (بدون گوشت) پرروغن رستورانی|Chickpea stew vegetarian, rich restaurant-style|120|4.9|9|7.2|خورش نخودچی بدون گوشت;وگان
خورش عدس با مرغ|Lentil stew with chicken|126|9.8|11|4.7|خورش عدس مرغ
خورش عدس با مرغ کم‌روغن|Lentil stew with chicken, low-oil|104|9.8|11|2.3|خورش عدس مرغ
خورش عدس با مرغ پرروغن رستورانی|Lentil stew with chicken, rich restaurant-style|154|9.8|11|7.9|خورش عدس مرغ
خورش عدس با ران مرغ|Lentil stew with chicken thigh|135|9.2|11|6|خورش عدس ران مرغ
خورش عدس با گوشت گوسفندی|Lentil stew with lamb|149|9.4|11|7.5|خورش عدس گوشت گوسفند;گوسفندی
خورش عدس با گوشت گوسفندی کم‌روغن|Lentil stew with lamb, low-oil|128|9.4|11|5.1|خورش عدس گوشت گوسفند;گوسفندی
خورش عدس با گوشت گوسفندی پرروغن رستورانی|Lentil stew with lamb, rich restaurant-style|178|9.4|11|10.7|خورش عدس گوشت گوسفند;گوسفندی
خورش عدس با گوشت گاو|Lentil stew with beef|137|10|11|5.9|خورش عدس گوشت گاو;گوساله
خورش عدس با گوشت گاو کم‌روغن|Lentil stew with beef, low-oil|116|10|11|3.5|خورش عدس گوشت گاو;گوساله
خورش عدس با گوشت گاو پرروغن رستورانی|Lentil stew with beef, rich restaurant-style|166|10|11|9.1|خورش عدس گوشت گاو;گوساله
خورش عدس گیاهی (بدون گوشت)|Lentil stew vegetarian|97|5.4|11|3.5|خورش عدس بدون گوشت;وگان
خورش عدس گیاهی (بدون گوشت) کم‌روغن|Lentil stew vegetarian, low-oil|76|5.4|11|1.2|خورش عدس بدون گوشت;وگان
خورش عدس گیاهی (بدون گوشت) پرروغن رستورانی|Lentil stew vegetarian, rich restaurant-style|126|5.4|11|6.7|خورش عدس بدون گوشت;وگان
خورش لوبیا چیتی با مرغ|Pinto bean stew with chicken|120|9.3|10|4.7|خورش لوبیا چیتی مرغ
خورش لوبیا چیتی با مرغ کم‌روغن|Pinto bean stew with chicken, low-oil|98|9.3|10|2.3|خورش لوبیا چیتی مرغ
خورش لوبیا چیتی با مرغ پرروغن رستورانی|Pinto bean stew with chicken, rich restaurant-style|148|9.3|10|7.9|خورش لوبیا چیتی مرغ
خورش لوبیا چیتی با ران مرغ|Pinto bean stew with chicken thigh|129|8.7|10|6|خورش لوبیا چیتی ران مرغ
خورش لوبیا چیتی با گوشت گوسفندی|Pinto bean stew with lamb|143|8.9|10|7.5|خورش لوبیا چیتی گوشت گوسفند;گوسفندی
خورش لوبیا چیتی با گوشت گوسفندی کم‌روغن|Pinto bean stew with lamb, low-oil|122|8.9|10|5.1|خورش لوبیا چیتی گوشت گوسفند;گوسفندی
خورش لوبیا چیتی با گوشت گوسفندی پرروغن رستورانی|Pinto bean stew with lamb, rich restaurant-style|172|8.9|10|10.7|خورش لوبیا چیتی گوشت گوسفند;گوسفندی
خورش لوبیا چیتی با گوشت گاو|Pinto bean stew with beef|131|9.5|10|5.9|خورش لوبیا چیتی گوشت گاو;گوساله
خورش لوبیا چیتی با گوشت گاو کم‌روغن|Pinto bean stew with beef, low-oil|110|9.5|10|3.5|خورش لوبیا چیتی گوشت گاو;گوساله
خورش لوبیا چیتی با گوشت گاو پرروغن رستورانی|Pinto bean stew with beef, rich restaurant-style|160|9.5|10|9.1|خورش لوبیا چیتی گوشت گاو;گوساله
خورش لوبیا چیتی گیاهی (بدون گوشت)|Pinto bean stew vegetarian|91|4.9|10|3.5|خورش لوبیا چیتی بدون گوشت;وگان
خورش لوبیا چیتی گیاهی (بدون گوشت) کم‌روغن|Pinto bean stew vegetarian, low-oil|70|4.9|10|1.2|خورش لوبیا چیتی بدون گوشت;وگان
خورش لوبیا چیتی گیاهی (بدون گوشت) پرروغن رستورانی|Pinto bean stew vegetarian, rich restaurant-style|120|4.9|10|6.7|خورش لوبیا چیتی بدون گوشت;وگان
خورش لوبیا چشم‌بلبلی با مرغ|Black-eyed pea stew with chicken|120|9.3|10|4.7|خورش لوبیا چشم‌بلبلی مرغ
خورش لوبیا چشم‌بلبلی با مرغ کم‌روغن|Black-eyed pea stew with chicken, low-oil|98|9.3|10|2.3|خورش لوبیا چشم‌بلبلی مرغ
خورش لوبیا چشم‌بلبلی با مرغ پرروغن رستورانی|Black-eyed pea stew with chicken, rich restaurant-style|148|9.3|10|7.9|خورش لوبیا چشم‌بلبلی مرغ
خورش لوبیا چشم‌بلبلی با ران مرغ|Black-eyed pea stew with chicken thigh|129|8.7|10|6|خورش لوبیا چشم‌بلبلی ران مرغ
خورش لوبیا چشم‌بلبلی با گوشت گوسفندی|Black-eyed pea stew with lamb|143|8.9|10|7.5|خورش لوبیا چشم‌بلبلی گوشت گوسفند;گوسفندی
خورش لوبیا چشم‌بلبلی با گوشت گوسفندی کم‌روغن|Black-eyed pea stew with lamb, low-oil|122|8.9|10|5.1|خورش لوبیا چشم‌بلبلی گوشت گوسفند;گوسفندی
خورش لوبیا چشم‌بلبلی با گوشت گوسفندی پرروغن رستورانی|Black-eyed pea stew with lamb, rich restaurant-style|172|8.9|10|10.7|خورش لوبیا چشم‌بلبلی گوشت گوسفند;گوسفندی
خورش لوبیا چشم‌بلبلی با گوشت گاو|Black-eyed pea stew with beef|131|9.5|10|5.9|خورش لوبیا چشم‌بلبلی گوشت گاو;گوساله
خورش لوبیا چشم‌بلبلی با گوشت گاو کم‌روغن|Black-eyed pea stew with beef, low-oil|110|9.5|10|3.5|خورش لوبیا چشم‌بلبلی گوشت گاو;گوساله
خورش لوبیا چشم‌بلبلی با گوشت گاو پرروغن رستورانی|Black-eyed pea stew with beef, rich restaurant-style|160|9.5|10|9.1|خورش لوبیا چشم‌بلبلی گوشت گاو;گوساله
خورش لوبیا چشم‌بلبلی گیاهی (بدون گوشت)|Black-eyed pea stew vegetarian|91|4.9|10|3.5|خورش لوبیا چشم‌بلبلی بدون گوشت;وگان
خورش لوبیا چشم‌بلبلی گیاهی (بدون گوشت) کم‌روغن|Black-eyed pea stew vegetarian, low-oil|70|4.9|10|1.2|خورش لوبیا چشم‌بلبلی بدون گوشت;وگان
خورش لوبیا چشم‌بلبلی گیاهی (بدون گوشت) پرروغن رستورانی|Black-eyed pea stew vegetarian, rich restaurant-style|120|4.9|10|6.7|خورش لوبیا چشم‌بلبلی بدون گوشت;وگان
خورش قارچ با مرغ|Mushroom stew with chicken|105|7.3|5|6.2|خورش قارچ مرغ
خورش قارچ با مرغ کم‌روغن|Mushroom stew with chicken, low-oil|83|7.3|5|3.8|خورش قارچ مرغ
خورش قارچ با مرغ پرروغن رستورانی|Mushroom stew with chicken, rich restaurant-style|134|7.3|5|9.4|خورش قارچ مرغ
خورش قارچ با ران مرغ|Mushroom stew with chicken thigh|114|6.7|5|7.5|خورش قارچ ران مرغ
خورش قارچ با گوشت گوسفندی|Mushroom stew with lamb|129|6.9|5|9|خورش قارچ گوشت گوسفند;گوسفندی
خورش قارچ با گوشت گوسفندی کم‌روغن|Mushroom stew with lamb, low-oil|107|6.9|5|6.6|خورش قارچ گوشت گوسفند;گوسفندی
خورش قارچ با گوشت گوسفندی پرروغن رستورانی|Mushroom stew with lamb, rich restaurant-style|157|6.9|5|12.2|خورش قارچ گوشت گوسفند;گوسفندی
خورش قارچ با گوشت گاو|Mushroom stew with beef|117|7.5|5|7.4|خورش قارچ گوشت گاو;گوساله
خورش قارچ با گوشت گاو کم‌روغن|Mushroom stew with beef, low-oil|95|7.5|5|5|خورش قارچ گوشت گاو;گوساله
خورش قارچ با گوشت گاو پرروغن رستورانی|Mushroom stew with beef, rich restaurant-style|145|7.5|5|10.6|خورش قارچ گوشت گاو;گوساله
خورش قارچ گیاهی (بدون گوشت)|Mushroom stew vegetarian|77|2.9|5|5|خورش قارچ بدون گوشت;وگان
خورش قارچ گیاهی (بدون گوشت) کم‌روغن|Mushroom stew vegetarian, low-oil|55|2.9|5|2.6|خورش قارچ بدون گوشت;وگان
خورش قارچ گیاهی (بدون گوشت) پرروغن رستورانی|Mushroom stew vegetarian, rich restaurant-style|105|2.9|5|8.2|خورش قارچ بدون گوشت;وگان
خورش کلم قمری با مرغ|Kohlrabi stew with chicken|96|6.3|6|5.2|خورش کلم قمری مرغ
خورش کلم قمری با مرغ کم‌روغن|Kohlrabi stew with chicken, low-oil|74|6.3|6|2.8|خورش کلم قمری مرغ
خورش کلم قمری با مرغ پرروغن رستورانی|Kohlrabi stew with chicken, rich restaurant-style|125|6.3|6|8.4|خورش کلم قمری مرغ
خورش کلم قمری با ران مرغ|Kohlrabi stew with chicken thigh|105|5.7|6|6.5|خورش کلم قمری ران مرغ
خورش کلم قمری با گوشت گوسفندی|Kohlrabi stew with lamb|120|5.9|6|8|خورش کلم قمری گوشت گوسفند;گوسفندی
خورش کلم قمری با گوشت گوسفندی کم‌روغن|Kohlrabi stew with lamb, low-oil|98|5.9|6|5.6|خورش کلم قمری گوشت گوسفند;گوسفندی
خورش کلم قمری با گوشت گوسفندی پرروغن رستورانی|Kohlrabi stew with lamb, rich restaurant-style|148|5.9|6|11.2|خورش کلم قمری گوشت گوسفند;گوسفندی
خورش کلم قمری با گوشت گاو|Kohlrabi stew with beef|108|6.5|6|6.4|خورش کلم قمری گوشت گاو;گوساله
خورش کلم قمری با گوشت گاو کم‌روغن|Kohlrabi stew with beef, low-oil|86|6.5|6|4|خورش کلم قمری گوشت گاو;گوساله
خورش کلم قمری با گوشت گاو پرروغن رستورانی|Kohlrabi stew with beef, rich restaurant-style|136|6.5|6|9.6|خورش کلم قمری گوشت گاو;گوساله
خورش کلم قمری گیاهی (بدون گوشت)|Kohlrabi stew vegetarian|68|1.9|6|4|خورش کلم قمری بدون گوشت;وگان
خورش کلم قمری گیاهی (بدون گوشت) کم‌روغن|Kohlrabi stew vegetarian, low-oil|46|1.9|6|1.6|خورش کلم قمری بدون گوشت;وگان
خورش کلم قمری گیاهی (بدون گوشت) پرروغن رستورانی|Kohlrabi stew vegetarian, rich restaurant-style|96|1.9|6|7.2|خورش کلم قمری بدون گوشت;وگان
خورش گل کلم با مرغ|Cauliflower stew with chicken|103|6.8|6|5.7|خورش گل کلم مرغ
خورش گل کلم با مرغ کم‌روغن|Cauliflower stew with chicken, low-oil|81|6.8|6|3.3|خورش گل کلم مرغ
خورش گل کلم با مرغ پرروغن رستورانی|Cauliflower stew with chicken, rich restaurant-style|131|6.8|6|8.9|خورش گل کلم مرغ
خورش گل کلم با ران مرغ|Cauliflower stew with chicken thigh|112|6.2|6|7|خورش گل کلم ران مرغ
خورش گل کلم با گوشت گوسفندی|Cauliflower stew with lamb|126|6.4|6|8.5|خورش گل کلم گوشت گوسفند;گوسفندی
خورش گل کلم با گوشت گوسفندی کم‌روغن|Cauliflower stew with lamb, low-oil|105|6.4|6|6.1|خورش گل کلم گوشت گوسفند;گوسفندی
خورش گل کلم با گوشت گوسفندی پرروغن رستورانی|Cauliflower stew with lamb, rich restaurant-style|155|6.4|6|11.7|خورش گل کلم گوشت گوسفند;گوسفندی
خورش گل کلم با گوشت گاو|Cauliflower stew with beef|114|7|6|6.9|خورش گل کلم گوشت گاو;گوساله
خورش گل کلم با گوشت گاو کم‌روغن|Cauliflower stew with beef, low-oil|93|7|6|4.5|خورش گل کلم گوشت گاو;گوساله
خورش گل کلم با گوشت گاو پرروغن رستورانی|Cauliflower stew with beef, rich restaurant-style|143|7|6|10.1|خورش گل کلم گوشت گاو;گوساله
خورش گل کلم گیاهی (بدون گوشت)|Cauliflower stew vegetarian|74|2.4|6|4.5|خورش گل کلم بدون گوشت;وگان
خورش گل کلم گیاهی (بدون گوشت) کم‌روغن|Cauliflower stew vegetarian, low-oil|53|2.4|6|2.1|خورش گل کلم بدون گوشت;وگان
خورش گل کلم گیاهی (بدون گوشت) پرروغن رستورانی|Cauliflower stew vegetarian, rich restaurant-style|103|2.4|6|7.7|خورش گل کلم بدون گوشت;وگان
خورش کلم برگ با مرغ|Cabbage stew with chicken|96|6.3|6|5.2|خورش کلم برگ مرغ
خورش کلم برگ با مرغ کم‌روغن|Cabbage stew with chicken, low-oil|74|6.3|6|2.8|خورش کلم برگ مرغ
خورش کلم برگ با مرغ پرروغن رستورانی|Cabbage stew with chicken, rich restaurant-style|125|6.3|6|8.4|خورش کلم برگ مرغ
خورش کلم برگ با ران مرغ|Cabbage stew with chicken thigh|105|5.7|6|6.5|خورش کلم برگ ران مرغ
خورش کلم برگ با گوشت گوسفندی|Cabbage stew with lamb|120|5.9|6|8|خورش کلم برگ گوشت گوسفند;گوسفندی
خورش کلم برگ با گوشت گوسفندی کم‌روغن|Cabbage stew with lamb, low-oil|98|5.9|6|5.6|خورش کلم برگ گوشت گوسفند;گوسفندی
خورش کلم برگ با گوشت گوسفندی پرروغن رستورانی|Cabbage stew with lamb, rich restaurant-style|148|5.9|6|11.2|خورش کلم برگ گوشت گوسفند;گوسفندی
خورش کلم برگ با گوشت گاو|Cabbage stew with beef|108|6.5|6|6.4|خورش کلم برگ گوشت گاو;گوساله
خورش کلم برگ با گوشت گاو کم‌روغن|Cabbage stew with beef, low-oil|86|6.5|6|4|خورش کلم برگ گوشت گاو;گوساله
خورش کلم برگ با گوشت گاو پرروغن رستورانی|Cabbage stew with beef, rich restaurant-style|136|6.5|6|9.6|خورش کلم برگ گوشت گاو;گوساله
خورش کلم برگ گیاهی (بدون گوشت)|Cabbage stew vegetarian|68|1.9|6|4|خورش کلم برگ بدون گوشت;وگان
خورش کلم برگ گیاهی (بدون گوشت) کم‌روغن|Cabbage stew vegetarian, low-oil|46|1.9|6|1.6|خورش کلم برگ بدون گوشت;وگان
خورش کلم برگ گیاهی (بدون گوشت) پرروغن رستورانی|Cabbage stew vegetarian, rich restaurant-style|96|1.9|6|7.2|خورش کلم برگ بدون گوشت;وگان
خورش شوید با مرغ|Dill stew with chicken|105|7.3|6|5.7|خورش شوید مرغ
خورش شوید با مرغ کم‌روغن|Dill stew with chicken, low-oil|83|7.3|6|3.3|خورش شوید مرغ
خورش شوید با مرغ پرروغن رستورانی|Dill stew with chicken, rich restaurant-style|133|7.3|6|8.9|خورش شوید مرغ
خورش شوید با ران مرغ|Dill stew with chicken thigh|114|6.7|6|7|خورش شوید ران مرغ
خورش شوید با گوشت گوسفندی|Dill stew with lamb|128|6.9|6|8.5|خورش شوید گوشت گوسفند;گوسفندی
خورش شوید با گوشت گوسفندی کم‌روغن|Dill stew with lamb, low-oil|107|6.9|6|6.1|خورش شوید گوشت گوسفند;گوسفندی
خورش شوید با گوشت گوسفندی پرروغن رستورانی|Dill stew with lamb, rich restaurant-style|157|6.9|6|11.7|خورش شوید گوشت گوسفند;گوسفندی
خورش شوید با گوشت گاو|Dill stew with beef|116|7.5|6|6.9|خورش شوید گوشت گاو;گوساله
خورش شوید با گوشت گاو کم‌روغن|Dill stew with beef, low-oil|95|7.5|6|4.5|خورش شوید گوشت گاو;گوساله
خورش شوید با گوشت گاو پرروغن رستورانی|Dill stew with beef, rich restaurant-style|145|7.5|6|10.1|خورش شوید گوشت گاو;گوساله
خورش شوید گیاهی (بدون گوشت)|Dill stew vegetarian|76|2.9|6|4.5|خورش شوید بدون گوشت;وگان
خورش شوید گیاهی (بدون گوشت) کم‌روغن|Dill stew vegetarian, low-oil|55|2.9|6|2.1|خورش شوید بدون گوشت;وگان
خورش شوید گیاهی (بدون گوشت) پرروغن رستورانی|Dill stew vegetarian, rich restaurant-style|105|2.9|6|7.7|خورش شوید بدون گوشت;وگان
خورش نعنا‌جعفری با مرغ|Mint and parsley stew with chicken|103|7.8|5|5.7|قورمه نعنا جعفری;خورش نعنا‌جعفری مرغ
خورش نعنا‌جعفری با مرغ کم‌روغن|Mint and parsley stew with chicken, low-oil|81|7.8|5|3.3|قورمه نعنا جعفری;خورش نعنا‌جعفری مرغ
خورش نعنا‌جعفری با مرغ پرروغن رستورانی|Mint and parsley stew with chicken, rich restaurant-style|131|7.8|5|8.9|قورمه نعنا جعفری;خورش نعنا‌جعفری مرغ
خورش نعنا‌جعفری با ران مرغ|Mint and parsley stew with chicken thigh|112|7.2|5|7|قورمه نعنا جعفری;خورش نعنا‌جعفری ران مرغ
خورش نعنا‌جعفری با گوشت گوسفندی|Mint and parsley stew with lamb|126|7.4|5|8.5|قورمه نعنا جعفری;خورش نعنا‌جعفری گوشت گوسفند;گوسفندی
خورش نعنا‌جعفری با گوشت گوسفندی کم‌روغن|Mint and parsley stew with lamb, low-oil|105|7.4|5|6.1|قورمه نعنا جعفری;خورش نعنا‌جعفری گوشت گوسفند;گوسفندی
خورش نعنا‌جعفری با گوشت گوسفندی پرروغن رستورانی|Mint and parsley stew with lamb, rich restaurant-style|155|7.4|5|11.7|قورمه نعنا جعفری;خورش نعنا‌جعفری گوشت گوسفند;گوسفندی
خورش نعنا‌جعفری با گوشت گاو|Mint and parsley stew with beef|114|8|5|6.9|قورمه نعنا جعفری;خورش نعنا‌جعفری گوشت گاو;گوساله
خورش نعنا‌جعفری با گوشت گاو کم‌روغن|Mint and parsley stew with beef, low-oil|93|8|5|4.5|قورمه نعنا جعفری;خورش نعنا‌جعفری گوشت گاو;گوساله
خورش نعنا‌جعفری با گوشت گاو پرروغن رستورانی|Mint and parsley stew with beef, rich restaurant-style|143|8|5|10.1|قورمه نعنا جعفری;خورش نعنا‌جعفری گوشت گاو;گوساله
خورش نعنا‌جعفری گیاهی (بدون گوشت)|Mint and parsley stew vegetarian|74|3.4|5|4.5|قورمه نعنا جعفری;خورش نعنا‌جعفری بدون گوشت;وگان
خورش نعنا‌جعفری گیاهی (بدون گوشت) کم‌روغن|Mint and parsley stew vegetarian, low-oil|53|3.4|5|2.1|قورمه نعنا جعفری;خورش نعنا‌جعفری بدون گوشت;وگان
خورش نعنا‌جعفری گیاهی (بدون گوشت) پرروغن رستورانی|Mint and parsley stew vegetarian, rich restaurant-style|103|3.4|5|7.7|قورمه نعنا جعفری;خورش نعنا‌جعفری بدون گوشت;وگان
خورش سبزی شمالی با مرغ|Northern herb stew with chicken|115|7.8|7|6.2|خورش سبزی شمالی مرغ
خورش سبزی شمالی با مرغ کم‌روغن|Northern herb stew with chicken, low-oil|93|7.8|7|3.8|خورش سبزی شمالی مرغ
خورش سبزی شمالی با مرغ پرروغن رستورانی|Northern herb stew with chicken, rich restaurant-style|144|7.8|7|9.4|خورش سبزی شمالی مرغ
خورش سبزی شمالی با ران مرغ|Northern herb stew with chicken thigh|124|7.2|7|7.5|خورش سبزی شمالی ران مرغ
خورش سبزی شمالی با گوشت گوسفندی|Northern herb stew with lamb|139|7.4|7|9|خورش سبزی شمالی گوشت گوسفند;گوسفندی
خورش سبزی شمالی با گوشت گوسفندی کم‌روغن|Northern herb stew with lamb, low-oil|117|7.4|7|6.6|خورش سبزی شمالی گوشت گوسفند;گوسفندی
خورش سبزی شمالی با گوشت گوسفندی پرروغن رستورانی|Northern herb stew with lamb, rich restaurant-style|167|7.4|7|12.2|خورش سبزی شمالی گوشت گوسفند;گوسفندی
خورش سبزی شمالی با گوشت گاو|Northern herb stew with beef|127|8|7|7.4|خورش سبزی شمالی گوشت گاو;گوساله
خورش سبزی شمالی با گوشت گاو کم‌روغن|Northern herb stew with beef, low-oil|105|8|7|5|خورش سبزی شمالی گوشت گاو;گوساله
خورش سبزی شمالی با گوشت گاو پرروغن رستورانی|Northern herb stew with beef, rich restaurant-style|155|8|7|10.6|خورش سبزی شمالی گوشت گاو;گوساله
خورش سبزی شمالی گیاهی (بدون گوشت)|Northern herb stew vegetarian|87|3.4|7|5|خورش سبزی شمالی بدون گوشت;وگان
خورش سبزی شمالی گیاهی (بدون گوشت) کم‌روغن|Northern herb stew vegetarian, low-oil|65|3.4|7|2.6|خورش سبزی شمالی بدون گوشت;وگان
خورش سبزی شمالی گیاهی (بدون گوشت) پرروغن رستورانی|Northern herb stew vegetarian, rich restaurant-style|115|3.4|7|8.2|خورش سبزی شمالی بدون گوشت;وگان
خورش ترشه با مرغ|Torsheh stew with chicken|123|7.8|9|6.2|ترشه تره;خورش ترشه مرغ
خورش ترشه با مرغ کم‌روغن|Torsheh stew with chicken, low-oil|101|7.8|9|3.8|ترشه تره;خورش ترشه مرغ
خورش ترشه با مرغ پرروغن رستورانی|Torsheh stew with chicken, rich restaurant-style|152|7.8|9|9.4|ترشه تره;خورش ترشه مرغ
خورش ترشه با ران مرغ|Torsheh stew with chicken thigh|132|7.2|9|7.5|ترشه تره;خورش ترشه ران مرغ
خورش ترشه با گوشت گوسفندی|Torsheh stew with lamb|147|7.4|9|9|ترشه تره;خورش ترشه گوشت گوسفند;گوسفندی
خورش ترشه با گوشت گوسفندی کم‌روغن|Torsheh stew with lamb, low-oil|125|7.4|9|6.6|ترشه تره;خورش ترشه گوشت گوسفند;گوسفندی
خورش ترشه با گوشت گوسفندی پرروغن رستورانی|Torsheh stew with lamb, rich restaurant-style|175|7.4|9|12.2|ترشه تره;خورش ترشه گوشت گوسفند;گوسفندی
خورش ترشه با گوشت گاو|Torsheh stew with beef|135|8|9|7.4|ترشه تره;خورش ترشه گوشت گاو;گوساله
خورش ترشه با گوشت گاو کم‌روغن|Torsheh stew with beef, low-oil|113|8|9|5|ترشه تره;خورش ترشه گوشت گاو;گوساله
خورش ترشه با گوشت گاو پرروغن رستورانی|Torsheh stew with beef, rich restaurant-style|163|8|9|10.6|ترشه تره;خورش ترشه گوشت گاو;گوساله
خورش ترشه گیاهی (بدون گوشت)|Torsheh stew vegetarian|95|3.4|9|5|ترشه تره;خورش ترشه بدون گوشت;وگان
خورش ترشه گیاهی (بدون گوشت) کم‌روغن|Torsheh stew vegetarian, low-oil|73|3.4|9|2.6|ترشه تره;خورش ترشه بدون گوشت;وگان
خورش ترشه گیاهی (بدون گوشت) پرروغن رستورانی|Torsheh stew vegetarian, rich restaurant-style|123|3.4|9|8.2|ترشه تره;خورش ترشه بدون گوشت;وگان
خورش آلو بخارا با مرغ|Prune bokhara stew with chicken|135|6.8|14|5.7|خورش آلو بخارا مرغ
خورش آلو بخارا با مرغ کم‌روغن|Prune bokhara stew with chicken, low-oil|113|6.8|14|3.3|خورش آلو بخارا مرغ
خورش آلو بخارا با مرغ پرروغن رستورانی|Prune bokhara stew with chicken, rich restaurant-style|163|6.8|14|8.9|خورش آلو بخارا مرغ
خورش آلو بخارا با ران مرغ|Prune bokhara stew with chicken thigh|144|6.2|14|7|خورش آلو بخارا ران مرغ
خورش آلو بخارا با گوشت گوسفندی|Prune bokhara stew with lamb|158|6.4|14|8.5|خورش آلو بخارا گوشت گوسفند;گوسفندی
خورش آلو بخارا با گوشت گوسفندی کم‌روغن|Prune bokhara stew with lamb, low-oil|137|6.4|14|6.1|خورش آلو بخارا گوشت گوسفند;گوسفندی
خورش آلو بخارا با گوشت گوسفندی پرروغن رستورانی|Prune bokhara stew with lamb, rich restaurant-style|187|6.4|14|11.7|خورش آلو بخارا گوشت گوسفند;گوسفندی
خورش آلو بخارا با گوشت گاو|Prune bokhara stew with beef|146|7|14|6.9|خورش آلو بخارا گوشت گاو;گوساله
خورش آلو بخارا با گوشت گاو کم‌روغن|Prune bokhara stew with beef, low-oil|125|7|14|4.5|خورش آلو بخارا گوشت گاو;گوساله
خورش آلو بخارا با گوشت گاو پرروغن رستورانی|Prune bokhara stew with beef, rich restaurant-style|175|7|14|10.1|خورش آلو بخارا گوشت گاو;گوساله
خورش آلو بخارا گیاهی (بدون گوشت)|Prune bokhara stew vegetarian|106|2.4|14|4.5|خورش آلو بخارا بدون گوشت;وگان
خورش آلو بخارا گیاهی (بدون گوشت) کم‌روغن|Prune bokhara stew vegetarian, low-oil|85|2.4|14|2.1|خورش آلو بخارا بدون گوشت;وگان
خورش آلو بخارا گیاهی (بدون گوشت) پرروغن رستورانی|Prune bokhara stew vegetarian, rich restaurant-style|135|2.4|14|7.7|خورش آلو بخارا بدون گوشت;وگان
خورش سیب‌زمینی با مرغ|Potato stew with chicken|118|6.8|11|5.2|خورش سیب زمینی;خورش سیب‌زمینی مرغ
خورش سیب‌زمینی با مرغ کم‌روغن|Potato stew with chicken, low-oil|96|6.8|11|2.8|خورش سیب زمینی;خورش سیب‌زمینی مرغ
خورش سیب‌زمینی با مرغ پرروغن رستورانی|Potato stew with chicken, rich restaurant-style|147|6.8|11|8.4|خورش سیب زمینی;خورش سیب‌زمینی مرغ
خورش سیب‌زمینی با ران مرغ|Potato stew with chicken thigh|127|6.2|11|6.5|خورش سیب زمینی;خورش سیب‌زمینی ران مرغ
خورش سیب‌زمینی با گوشت گوسفندی|Potato stew with lamb|142|6.4|11|8|خورش سیب زمینی;خورش سیب‌زمینی گوشت گوسفند;گوسفندی
خورش سیب‌زمینی با گوشت گوسفندی کم‌روغن|Potato stew with lamb, low-oil|120|6.4|11|5.6|خورش سیب زمینی;خورش سیب‌زمینی گوشت گوسفند;گوسفندی
خورش سیب‌زمینی با گوشت گوسفندی پرروغن رستورانی|Potato stew with lamb, rich restaurant-style|170|6.4|11|11.2|خورش سیب زمینی;خورش سیب‌زمینی گوشت گوسفند;گوسفندی
خورش سیب‌زمینی با گوشت گاو|Potato stew with beef|130|7|11|6.4|خورش سیب زمینی;خورش سیب‌زمینی گوشت گاو;گوساله
خورش سیب‌زمینی با گوشت گاو کم‌روغن|Potato stew with beef, low-oil|108|7|11|4|خورش سیب زمینی;خورش سیب‌زمینی گوشت گاو;گوساله
خورش سیب‌زمینی با گوشت گاو پرروغن رستورانی|Potato stew with beef, rich restaurant-style|158|7|11|9.6|خورش سیب زمینی;خورش سیب‌زمینی گوشت گاو;گوساله
خورش سیب‌زمینی گیاهی (بدون گوشت)|Potato stew vegetarian|90|2.4|11|4|خورش سیب زمینی;خورش سیب‌زمینی بدون گوشت;وگان
خورش سیب‌زمینی گیاهی (بدون گوشت) کم‌روغن|Potato stew vegetarian, low-oil|68|2.4|11|1.6|خورش سیب زمینی;خورش سیب‌زمینی بدون گوشت;وگان
خورش سیب‌زمینی گیاهی (بدون گوشت) پرروغن رستورانی|Potato stew vegetarian, rich restaurant-style|118|2.4|11|7.2|خورش سیب زمینی;خورش سیب‌زمینی بدون گوشت;وگان
خورش گوجه‌فرنگی با مرغ|Tomato stew with chicken|107|6.8|7|5.7|خورش گوجه;خورش گوجه‌فرنگی مرغ
خورش گوجه‌فرنگی با مرغ کم‌روغن|Tomato stew with chicken, low-oil|85|6.8|7|3.3|خورش گوجه;خورش گوجه‌فرنگی مرغ
خورش گوجه‌فرنگی با مرغ پرروغن رستورانی|Tomato stew with chicken, rich restaurant-style|135|6.8|7|8.9|خورش گوجه;خورش گوجه‌فرنگی مرغ
خورش گوجه‌فرنگی با ران مرغ|Tomato stew with chicken thigh|116|6.2|7|7|خورش گوجه;خورش گوجه‌فرنگی ران مرغ
خورش گوجه‌فرنگی با گوشت گوسفندی|Tomato stew with lamb|130|6.4|7|8.5|خورش گوجه;خورش گوجه‌فرنگی گوشت گوسفند;گوسفندی
خورش گوجه‌فرنگی با گوشت گوسفندی کم‌روغن|Tomato stew with lamb, low-oil|109|6.4|7|6.1|خورش گوجه;خورش گوجه‌فرنگی گوشت گوسفند;گوسفندی
خورش گوجه‌فرنگی با گوشت گوسفندی پرروغن رستورانی|Tomato stew with lamb, rich restaurant-style|159|6.4|7|11.7|خورش گوجه;خورش گوجه‌فرنگی گوشت گوسفند;گوسفندی
خورش گوجه‌فرنگی با گوشت گاو|Tomato stew with beef|118|7|7|6.9|خورش گوجه;خورش گوجه‌فرنگی گوشت گاو;گوساله
خورش گوجه‌فرنگی با گوشت گاو کم‌روغن|Tomato stew with beef, low-oil|97|7|7|4.5|خورش گوجه;خورش گوجه‌فرنگی گوشت گاو;گوساله
خورش گوجه‌فرنگی با گوشت گاو پرروغن رستورانی|Tomato stew with beef, rich restaurant-style|147|7|7|10.1|خورش گوجه;خورش گوجه‌فرنگی گوشت گاو;گوساله
خورش گوجه‌فرنگی گیاهی (بدون گوشت)|Tomato stew vegetarian|78|2.4|7|4.5|خورش گوجه;خورش گوجه‌فرنگی بدون گوشت;وگان
خورش گوجه‌فرنگی گیاهی (بدون گوشت) کم‌روغن|Tomato stew vegetarian, low-oil|57|2.4|7|2.1|خورش گوجه;خورش گوجه‌فرنگی بدون گوشت;وگان
خورش گوجه‌فرنگی گیاهی (بدون گوشت) پرروغن رستورانی|Tomato stew vegetarian, rich restaurant-style|107|2.4|7|7.7|خورش گوجه;خورش گوجه‌فرنگی بدون گوشت;وگان
خورش زرشک با مرغ|Barberry stew with chicken|122|6.8|12|5.2|خورش زرشک مرغ
خورش زرشک با مرغ کم‌روغن|Barberry stew with chicken, low-oil|100|6.8|12|2.8|خورش زرشک مرغ
خورش زرشک با مرغ پرروغن رستورانی|Barberry stew with chicken, rich restaurant-style|151|6.8|12|8.4|خورش زرشک مرغ
خورش زرشک با ران مرغ|Barberry stew with chicken thigh|131|6.2|12|6.5|خورش زرشک ران مرغ
خورش زرشک با گوشت گوسفندی|Barberry stew with lamb|146|6.4|12|8|خورش زرشک گوشت گوسفند;گوسفندی
خورش زرشک با گوشت گوسفندی کم‌روغن|Barberry stew with lamb, low-oil|124|6.4|12|5.6|خورش زرشک گوشت گوسفند;گوسفندی
خورش زرشک با گوشت گوسفندی پرروغن رستورانی|Barberry stew with lamb, rich restaurant-style|174|6.4|12|11.2|خورش زرشک گوشت گوسفند;گوسفندی
خورش زرشک با گوشت گاو|Barberry stew with beef|134|7|12|6.4|خورش زرشک گوشت گاو;گوساله
خورش زرشک با گوشت گاو کم‌روغن|Barberry stew with beef, low-oil|112|7|12|4|خورش زرشک گوشت گاو;گوساله
خورش زرشک با گوشت گاو پرروغن رستورانی|Barberry stew with beef, rich restaurant-style|162|7|12|9.6|خورش زرشک گوشت گاو;گوساله
خورش زرشک گیاهی (بدون گوشت)|Barberry stew vegetarian|94|2.4|12|4|خورش زرشک بدون گوشت;وگان
خورش زرشک گیاهی (بدون گوشت) کم‌روغن|Barberry stew vegetarian, low-oil|72|2.4|12|1.6|خورش زرشک بدون گوشت;وگان
خورش زرشک گیاهی (بدون گوشت) پرروغن رستورانی|Barberry stew vegetarian, rich restaurant-style|122|2.4|12|7.2|خورش زرشک بدون گوشت;وگان
خورش انجیر با مرغ|Fig stew with chicken|131|6.8|13|5.7|خورش انجیر مرغ
خورش انجیر با مرغ کم‌روغن|Fig stew with chicken, low-oil|109|6.8|13|3.3|خورش انجیر مرغ
خورش انجیر با مرغ پرروغن رستورانی|Fig stew with chicken, rich restaurant-style|159|6.8|13|8.9|خورش انجیر مرغ
خورش انجیر با ران مرغ|Fig stew with chicken thigh|140|6.2|13|7|خورش انجیر ران مرغ
خورش انجیر با گوشت گوسفندی|Fig stew with lamb|154|6.4|13|8.5|خورش انجیر گوشت گوسفند;گوسفندی
خورش انجیر با گوشت گوسفندی کم‌روغن|Fig stew with lamb, low-oil|133|6.4|13|6.1|خورش انجیر گوشت گوسفند;گوسفندی
خورش انجیر با گوشت گوسفندی پرروغن رستورانی|Fig stew with lamb, rich restaurant-style|183|6.4|13|11.7|خورش انجیر گوشت گوسفند;گوسفندی
خورش انجیر با گوشت گاو|Fig stew with beef|142|7|13|6.9|خورش انجیر گوشت گاو;گوساله
خورش انجیر با گوشت گاو کم‌روغن|Fig stew with beef, low-oil|121|7|13|4.5|خورش انجیر گوشت گاو;گوساله
خورش انجیر با گوشت گاو پرروغن رستورانی|Fig stew with beef, rich restaurant-style|171|7|13|10.1|خورش انجیر گوشت گاو;گوساله
خورش انجیر گیاهی (بدون گوشت)|Fig stew vegetarian|102|2.4|13|4.5|خورش انجیر بدون گوشت;وگان
خورش انجیر گیاهی (بدون گوشت) کم‌روغن|Fig stew vegetarian, low-oil|81|2.4|13|2.1|خورش انجیر بدون گوشت;وگان
خورش انجیر گیاهی (بدون گوشت) پرروغن رستورانی|Fig stew vegetarian, rich restaurant-style|131|2.4|13|7.7|خورش انجیر بدون گوشت;وگان
خورش به آلو با مرغ|Quince prune stew with chicken|128|6.3|14|5.2|خورش به آلو مرغ
خورش به آلو با مرغ کم‌روغن|Quince prune stew with chicken, low-oil|106|6.3|14|2.8|خورش به آلو مرغ
خورش به آلو با مرغ پرروغن رستورانی|Quince prune stew with chicken, rich restaurant-style|157|6.3|14|8.4|خورش به آلو مرغ
خورش به آلو با ران مرغ|Quince prune stew with chicken thigh|137|5.7|14|6.5|خورش به آلو ران مرغ
خورش به آلو با گوشت گوسفندی|Quince prune stew with lamb|152|5.9|14|8|خورش به آلو گوشت گوسفند;گوسفندی
خورش به آلو با گوشت گوسفندی کم‌روغن|Quince prune stew with lamb, low-oil|130|5.9|14|5.6|خورش به آلو گوشت گوسفند;گوسفندی
خورش به آلو با گوشت گوسفندی پرروغن رستورانی|Quince prune stew with lamb, rich restaurant-style|180|5.9|14|11.2|خورش به آلو گوشت گوسفند;گوسفندی
خورش به آلو با گوشت گاو|Quince prune stew with beef|140|6.5|14|6.4|خورش به آلو گوشت گاو;گوساله
خورش به آلو با گوشت گاو کم‌روغن|Quince prune stew with beef, low-oil|118|6.5|14|4|خورش به آلو گوشت گاو;گوساله
خورش به آلو با گوشت گاو پرروغن رستورانی|Quince prune stew with beef, rich restaurant-style|168|6.5|14|9.6|خورش به آلو گوشت گاو;گوساله
خورش به آلو گیاهی (بدون گوشت)|Quince prune stew vegetarian|100|1.9|14|4|خورش به آلو بدون گوشت;وگان
خورش به آلو گیاهی (بدون گوشت) کم‌روغن|Quince prune stew vegetarian, low-oil|78|1.9|14|1.6|خورش به آلو بدون گوشت;وگان
خورش به آلو گیاهی (بدون گوشت) پرروغن رستورانی|Quince prune stew vegetarian, rich restaurant-style|128|1.9|14|7.2|خورش به آلو بدون گوشت;وگان
خورش هلو با مرغ|Peach stew with chicken|116|6.3|11|5.2|خورش هلو مرغ
خورش هلو با مرغ کم‌روغن|Peach stew with chicken, low-oil|94|6.3|11|2.8|خورش هلو مرغ
خورش هلو با مرغ پرروغن رستورانی|Peach stew with chicken, rich restaurant-style|145|6.3|11|8.4|خورش هلو مرغ
خورش هلو با ران مرغ|Peach stew with chicken thigh|125|5.7|11|6.5|خورش هلو ران مرغ
خورش هلو با گوشت گوسفندی|Peach stew with lamb|140|5.9|11|8|خورش هلو گوشت گوسفند;گوسفندی
خورش هلو با گوشت گوسفندی کم‌روغن|Peach stew with lamb, low-oil|118|5.9|11|5.6|خورش هلو گوشت گوسفند;گوسفندی
خورش هلو با گوشت گوسفندی پرروغن رستورانی|Peach stew with lamb, rich restaurant-style|168|5.9|11|11.2|خورش هلو گوشت گوسفند;گوسفندی
خورش هلو با گوشت گاو|Peach stew with beef|128|6.5|11|6.4|خورش هلو گوشت گاو;گوساله
خورش هلو با گوشت گاو کم‌روغن|Peach stew with beef, low-oil|106|6.5|11|4|خورش هلو گوشت گاو;گوساله
خورش هلو با گوشت گاو پرروغن رستورانی|Peach stew with beef, rich restaurant-style|156|6.5|11|9.6|خورش هلو گوشت گاو;گوساله
خورش هلو گیاهی (بدون گوشت)|Peach stew vegetarian|88|1.9|11|4|خورش هلو بدون گوشت;وگان
خورش هلو گیاهی (بدون گوشت) کم‌روغن|Peach stew vegetarian, low-oil|66|1.9|11|1.6|خورش هلو بدون گوشت;وگان
خورش هلو گیاهی (بدون گوشت) پرروغن رستورانی|Peach stew vegetarian, rich restaurant-style|116|1.9|11|7.2|خورش هلو بدون گوشت;وگان
خورش لپه‌ریواس با مرغ|Split pea rhubarb stew with chicken|114|8.8|8|5.2|خورش لپه‌ریواس مرغ
خورش لپه‌ریواس با مرغ کم‌روغن|Split pea rhubarb stew with chicken, low-oil|92|8.8|8|2.8|خورش لپه‌ریواس مرغ
خورش لپه‌ریواس با مرغ پرروغن رستورانی|Split pea rhubarb stew with chicken, rich restaurant-style|143|8.8|8|8.4|خورش لپه‌ریواس مرغ
خورش لپه‌ریواس با ران مرغ|Split pea rhubarb stew with chicken thigh|123|8.2|8|6.5|خورش لپه‌ریواس ران مرغ
خورش لپه‌ریواس با گوشت گوسفندی|Split pea rhubarb stew with lamb|138|8.4|8|8|خورش لپه‌ریواس گوشت گوسفند;گوسفندی
خورش لپه‌ریواس با گوشت گوسفندی کم‌روغن|Split pea rhubarb stew with lamb, low-oil|116|8.4|8|5.6|خورش لپه‌ریواس گوشت گوسفند;گوسفندی
خورش لپه‌ریواس با گوشت گوسفندی پرروغن رستورانی|Split pea rhubarb stew with lamb, rich restaurant-style|166|8.4|8|11.2|خورش لپه‌ریواس گوشت گوسفند;گوسفندی
خورش لپه‌ریواس با گوشت گاو|Split pea rhubarb stew with beef|126|9|8|6.4|خورش لپه‌ریواس گوشت گاو;گوساله
خورش لپه‌ریواس با گوشت گاو کم‌روغن|Split pea rhubarb stew with beef, low-oil|104|9|8|4|خورش لپه‌ریواس گوشت گاو;گوساله
خورش لپه‌ریواس با گوشت گاو پرروغن رستورانی|Split pea rhubarb stew with beef, rich restaurant-style|154|9|8|9.6|خورش لپه‌ریواس گوشت گاو;گوساله
خورش لپه‌ریواس گیاهی (بدون گوشت)|Split pea rhubarb stew vegetarian|86|4.4|8|4|خورش لپه‌ریواس بدون گوشت;وگان
خورش لپه‌ریواس گیاهی (بدون گوشت) کم‌روغن|Split pea rhubarb stew vegetarian, low-oil|64|4.4|8|1.6|خورش لپه‌ریواس بدون گوشت;وگان
خورش لپه‌ریواس گیاهی (بدون گوشت) پرروغن رستورانی|Split pea rhubarb stew vegetarian, rich restaurant-style|114|4.4|8|7.2|خورش لپه‌ریواس بدون گوشت;وگان
خورش ماش با مرغ|Mung bean stew with chicken|116|9.3|9|4.7|خورش ماش;خورش ماش مرغ
خورش ماش با مرغ کم‌روغن|Mung bean stew with chicken, low-oil|94|9.3|9|2.3|خورش ماش;خورش ماش مرغ
خورش ماش با مرغ پرروغن رستورانی|Mung bean stew with chicken, rich restaurant-style|144|9.3|9|7.9|خورش ماش;خورش ماش مرغ
خورش ماش با ران مرغ|Mung bean stew with chicken thigh|125|8.7|9|6|خورش ماش;خورش ماش ران مرغ
خورش ماش با گوشت گوسفندی|Mung bean stew with lamb|139|8.9|9|7.5|خورش ماش;خورش ماش گوشت گوسفند;گوسفندی
خورش ماش با گوشت گوسفندی کم‌روغن|Mung bean stew with lamb, low-oil|118|8.9|9|5.1|خورش ماش;خورش ماش گوشت گوسفند;گوسفندی
خورش ماش با گوشت گوسفندی پرروغن رستورانی|Mung bean stew with lamb, rich restaurant-style|168|8.9|9|10.7|خورش ماش;خورش ماش گوشت گوسفند;گوسفندی
خورش ماش با گوشت گاو|Mung bean stew with beef|127|9.5|9|5.9|خورش ماش;خورش ماش گوشت گاو;گوساله
خورش ماش با گوشت گاو کم‌روغن|Mung bean stew with beef, low-oil|106|9.5|9|3.5|خورش ماش;خورش ماش گوشت گاو;گوساله
خورش ماش با گوشت گاو پرروغن رستورانی|Mung bean stew with beef, rich restaurant-style|156|9.5|9|9.1|خورش ماش;خورش ماش گوشت گاو;گوساله
خورش ماش گیاهی (بدون گوشت)|Mung bean stew vegetarian|87|4.9|9|3.5|خورش ماش;خورش ماش بدون گوشت;وگان
خورش ماش گیاهی (بدون گوشت) کم‌روغن|Mung bean stew vegetarian, low-oil|66|4.9|9|1.2|خورش ماش;خورش ماش بدون گوشت;وگان
خورش ماش گیاهی (بدون گوشت) پرروغن رستورانی|Mung bean stew vegetarian, rich restaurant-style|116|4.9|9|6.7|خورش ماش;خورش ماش بدون گوشت;وگان
خورش باقالی با مرغ|Fava bean stew with chicken|124|9.3|10|5.2|خورش باقلا;خورش باقالی مرغ
خورش باقالی با مرغ کم‌روغن|Fava bean stew with chicken, low-oil|102|9.3|10|2.8|خورش باقلا;خورش باقالی مرغ
خورش باقالی با مرغ پرروغن رستورانی|Fava bean stew with chicken, rich restaurant-style|153|9.3|10|8.4|خورش باقلا;خورش باقالی مرغ
خورش باقالی با ران مرغ|Fava bean stew with chicken thigh|133|8.7|10|6.5|خورش باقلا;خورش باقالی ران مرغ
خورش باقالی با گوشت گوسفندی|Fava bean stew with lamb|148|8.9|10|8|خورش باقلا;خورش باقالی گوشت گوسفند;گوسفندی
خورش باقالی با گوشت گوسفندی کم‌روغن|Fava bean stew with lamb, low-oil|126|8.9|10|5.6|خورش باقلا;خورش باقالی گوشت گوسفند;گوسفندی
خورش باقالی با گوشت گوسفندی پرروغن رستورانی|Fava bean stew with lamb, rich restaurant-style|176|8.9|10|11.2|خورش باقلا;خورش باقالی گوشت گوسفند;گوسفندی
خورش باقالی با گوشت گاو|Fava bean stew with beef|136|9.5|10|6.4|خورش باقلا;خورش باقالی گوشت گاو;گوساله
خورش باقالی با گوشت گاو کم‌روغن|Fava bean stew with beef, low-oil|114|9.5|10|4|خورش باقلا;خورش باقالی گوشت گاو;گوساله
خورش باقالی با گوشت گاو پرروغن رستورانی|Fava bean stew with beef, rich restaurant-style|164|9.5|10|9.6|خورش باقلا;خورش باقالی گوشت گاو;گوساله
خورش باقالی گیاهی (بدون گوشت)|Fava bean stew vegetarian|96|4.9|10|4|خورش باقلا;خورش باقالی بدون گوشت;وگان
خورش باقالی گیاهی (بدون گوشت) کم‌روغن|Fava bean stew vegetarian, low-oil|74|4.9|10|1.6|خورش باقلا;خورش باقالی بدون گوشت;وگان
خورش باقالی گیاهی (بدون گوشت) پرروغن رستورانی|Fava bean stew vegetarian, rich restaurant-style|124|4.9|10|7.2|خورش باقلا;خورش باقالی بدون گوشت;وگان
خورش اسفناج‌آلو شیرین با مرغ|Sweet prune spinach stew with chicken|120|7.3|11|5.2|خورش اسفناج‌آلو شیرین مرغ
خورش اسفناج‌آلو شیرین با مرغ کم‌روغن|Sweet prune spinach stew with chicken, low-oil|98|7.3|11|2.8|خورش اسفناج‌آلو شیرین مرغ
خورش اسفناج‌آلو شیرین با مرغ پرروغن رستورانی|Sweet prune spinach stew with chicken, rich restaurant-style|149|7.3|11|8.4|خورش اسفناج‌آلو شیرین مرغ
خورش اسفناج‌آلو شیرین با ران مرغ|Sweet prune spinach stew with chicken thigh|129|6.7|11|6.5|خورش اسفناج‌آلو شیرین ران مرغ
خورش اسفناج‌آلو شیرین با گوشت گوسفندی|Sweet prune spinach stew with lamb|144|6.9|11|8|خورش اسفناج‌آلو شیرین گوشت گوسفند;گوسفندی
خورش اسفناج‌آلو شیرین با گوشت گوسفندی کم‌روغن|Sweet prune spinach stew with lamb, low-oil|122|6.9|11|5.6|خورش اسفناج‌آلو شیرین گوشت گوسفند;گوسفندی
خورش اسفناج‌آلو شیرین با گوشت گوسفندی پرروغن رستورانی|Sweet prune spinach stew with lamb, rich restaurant-style|172|6.9|11|11.2|خورش اسفناج‌آلو شیرین گوشت گوسفند;گوسفندی
خورش اسفناج‌آلو شیرین با گوشت گاو|Sweet prune spinach stew with beef|132|7.5|11|6.4|خورش اسفناج‌آلو شیرین گوشت گاو;گوساله
خورش اسفناج‌آلو شیرین با گوشت گاو کم‌روغن|Sweet prune spinach stew with beef, low-oil|110|7.5|11|4|خورش اسفناج‌آلو شیرین گوشت گاو;گوساله
خورش اسفناج‌آلو شیرین با گوشت گاو پرروغن رستورانی|Sweet prune spinach stew with beef, rich restaurant-style|160|7.5|11|9.6|خورش اسفناج‌آلو شیرین گوشت گاو;گوساله
خورش اسفناج‌آلو شیرین گیاهی (بدون گوشت)|Sweet prune spinach stew vegetarian|92|2.9|11|4|خورش اسفناج‌آلو شیرین بدون گوشت;وگان
خورش اسفناج‌آلو شیرین گیاهی (بدون گوشت) کم‌روغن|Sweet prune spinach stew vegetarian, low-oil|70|2.9|11|1.6|خورش اسفناج‌آلو شیرین بدون گوشت;وگان
خورش اسفناج‌آلو شیرین گیاهی (بدون گوشت) پرروغن رستورانی|Sweet prune spinach stew vegetarian, rich restaurant-style|120|2.9|11|7.2|خورش اسفناج‌آلو شیرین بدون گوشت;وگان
خورش شیرین با مرغ|Sweet stew with chicken|141|7.3|14|6.2|خورش شیرین مرغ
خورش شیرین با مرغ کم‌روغن|Sweet stew with chicken, low-oil|119|7.3|14|3.8|خورش شیرین مرغ
خورش شیرین با مرغ پرروغن رستورانی|Sweet stew with chicken, rich restaurant-style|170|7.3|14|9.4|خورش شیرین مرغ
خورش شیرین با ران مرغ|Sweet stew with chicken thigh|150|6.7|14|7.5|خورش شیرین ران مرغ
خورش شیرین با گوشت گوسفندی|Sweet stew with lamb|165|6.9|14|9|خورش شیرین گوشت گوسفند;گوسفندی
خورش شیرین با گوشت گوسفندی کم‌روغن|Sweet stew with lamb, low-oil|143|6.9|14|6.6|خورش شیرین گوشت گوسفند;گوسفندی
خورش شیرین با گوشت گوسفندی پرروغن رستورانی|Sweet stew with lamb, rich restaurant-style|193|6.9|14|12.2|خورش شیرین گوشت گوسفند;گوسفندی
خورش شیرین با گوشت گاو|Sweet stew with beef|153|7.5|14|7.4|خورش شیرین گوشت گاو;گوساله
خورش شیرین با گوشت گاو کم‌روغن|Sweet stew with beef, low-oil|131|7.5|14|5|خورش شیرین گوشت گاو;گوساله
خورش شیرین با گوشت گاو پرروغن رستورانی|Sweet stew with beef, rich restaurant-style|181|7.5|14|10.6|خورش شیرین گوشت گاو;گوساله
خورش شیرین گیاهی (بدون گوشت)|Sweet stew vegetarian|113|2.9|14|5|خورش شیرین بدون گوشت;وگان
خورش شیرین گیاهی (بدون گوشت) کم‌روغن|Sweet stew vegetarian, low-oil|91|2.9|14|2.6|خورش شیرین بدون گوشت;وگان
خورش شیرین گیاهی (بدون گوشت) پرروغن رستورانی|Sweet stew vegetarian, rich restaurant-style|141|2.9|14|8.2|خورش شیرین بدون گوشت;وگان
خورش کدو تنبل با گردو با مرغ|Pumpkin walnut stew with chicken|136|7.8|10|7.2|خورش کدو تنبل با گردو مرغ
خورش کدو تنبل با گردو با مرغ کم‌روغن|Pumpkin walnut stew with chicken, low-oil|114|7.8|10|4.8|خورش کدو تنبل با گردو مرغ
خورش کدو تنبل با گردو با مرغ پرروغن رستورانی|Pumpkin walnut stew with chicken, rich restaurant-style|165|7.8|10|10.4|خورش کدو تنبل با گردو مرغ
خورش کدو تنبل با گردو با ران مرغ|Pumpkin walnut stew with chicken thigh|145|7.2|10|8.5|خورش کدو تنبل با گردو ران مرغ
خورش کدو تنبل با گردو با گوشت گوسفندی|Pumpkin walnut stew with lamb|160|7.4|10|10|خورش کدو تنبل با گردو گوشت گوسفند;گوسفندی
خورش کدو تنبل با گردو با گوشت گوسفندی کم‌روغن|Pumpkin walnut stew with lamb, low-oil|138|7.4|10|7.6|خورش کدو تنبل با گردو گوشت گوسفند;گوسفندی
خورش کدو تنبل با گردو با گوشت گوسفندی پرروغن رستورانی|Pumpkin walnut stew with lamb, rich restaurant-style|188|7.4|10|13.2|خورش کدو تنبل با گردو گوشت گوسفند;گوسفندی
خورش کدو تنبل با گردو با گوشت گاو|Pumpkin walnut stew with beef|148|8|10|8.4|خورش کدو تنبل با گردو گوشت گاو;گوساله
خورش کدو تنبل با گردو با گوشت گاو کم‌روغن|Pumpkin walnut stew with beef, low-oil|126|8|10|6|خورش کدو تنبل با گردو گوشت گاو;گوساله
خورش کدو تنبل با گردو با گوشت گاو پرروغن رستورانی|Pumpkin walnut stew with beef, rich restaurant-style|176|8|10|11.6|خورش کدو تنبل با گردو گوشت گاو;گوساله
خورش کدو تنبل با گردو گیاهی (بدون گوشت)|Pumpkin walnut stew vegetarian|108|3.4|10|6|خورش کدو تنبل با گردو بدون گوشت;وگان
خورش کدو تنبل با گردو گیاهی (بدون گوشت) کم‌روغن|Pumpkin walnut stew vegetarian, low-oil|86|3.4|10|3.6|خورش کدو تنبل با گردو بدون گوشت;وگان
خورش کدو تنبل با گردو گیاهی (بدون گوشت) پرروغن رستورانی|Pumpkin walnut stew vegetarian, rich restaurant-style|136|3.4|10|9.2|خورش کدو تنبل با گردو بدون گوشت;وگان
خورش میرزا قاسمی‌ای با مرغ|Mirza ghasemi stew stew with chicken|103|6.8|5|6.2|خورش میرزا قاسمی‌ای مرغ
خورش میرزا قاسمی‌ای با مرغ کم‌روغن|Mirza ghasemi stew stew with chicken, low-oil|81|6.8|5|3.8|خورش میرزا قاسمی‌ای مرغ
خورش میرزا قاسمی‌ای با مرغ پرروغن رستورانی|Mirza ghasemi stew stew with chicken, rich restaurant-style|132|6.8|5|9.4|خورش میرزا قاسمی‌ای مرغ
خورش میرزا قاسمی‌ای با ران مرغ|Mirza ghasemi stew stew with chicken thigh|112|6.2|5|7.5|خورش میرزا قاسمی‌ای ران مرغ
خورش میرزا قاسمی‌ای با گوشت گوسفندی|Mirza ghasemi stew stew with lamb|127|6.4|5|9|خورش میرزا قاسمی‌ای گوشت گوسفند;گوسفندی
خورش میرزا قاسمی‌ای با گوشت گوسفندی کم‌روغن|Mirza ghasemi stew stew with lamb, low-oil|105|6.4|5|6.6|خورش میرزا قاسمی‌ای گوشت گوسفند;گوسفندی
خورش میرزا قاسمی‌ای با گوشت گوسفندی پرروغن رستورانی|Mirza ghasemi stew stew with lamb, rich restaurant-style|155|6.4|5|12.2|خورش میرزا قاسمی‌ای گوشت گوسفند;گوسفندی
خورش میرزا قاسمی‌ای با گوشت گاو|Mirza ghasemi stew stew with beef|115|7|5|7.4|خورش میرزا قاسمی‌ای گوشت گاو;گوساله
خورش میرزا قاسمی‌ای با گوشت گاو کم‌روغن|Mirza ghasemi stew stew with beef, low-oil|93|7|5|5|خورش میرزا قاسمی‌ای گوشت گاو;گوساله
خورش میرزا قاسمی‌ای با گوشت گاو پرروغن رستورانی|Mirza ghasemi stew stew with beef, rich restaurant-style|143|7|5|10.6|خورش میرزا قاسمی‌ای گوشت گاو;گوساله
خورش میرزا قاسمی‌ای گیاهی (بدون گوشت)|Mirza ghasemi stew stew vegetarian|75|2.4|5|5|خورش میرزا قاسمی‌ای بدون گوشت;وگان
خورش میرزا قاسمی‌ای گیاهی (بدون گوشت) کم‌روغن|Mirza ghasemi stew stew vegetarian, low-oil|53|2.4|5|2.6|خورش میرزا قاسمی‌ای بدون گوشت;وگان
خورش میرزا قاسمی‌ای گیاهی (بدون گوشت) پرروغن رستورانی|Mirza ghasemi stew stew vegetarian, rich restaurant-style|103|2.4|5|8.2|خورش میرزا قاسمی‌ای بدون گوشت;وگان
خورش قلیه ماهی خوزستانی با مرغ|Khuzestan ghalieh stew stew with chicken|111|8.8|5|6.2|خورش قلیه ماهی خوزستانی مرغ
خورش قلیه ماهی خوزستانی با مرغ کم‌روغن|Khuzestan ghalieh stew stew with chicken, low-oil|89|8.8|5|3.8|خورش قلیه ماهی خوزستانی مرغ
خورش قلیه ماهی خوزستانی با مرغ پرروغن رستورانی|Khuzestan ghalieh stew stew with chicken, rich restaurant-style|140|8.8|5|9.4|خورش قلیه ماهی خوزستانی مرغ
خورش قلیه ماهی خوزستانی با ران مرغ|Khuzestan ghalieh stew stew with chicken thigh|120|8.2|5|7.5|خورش قلیه ماهی خوزستانی ران مرغ
خورش قلیه ماهی خوزستانی با گوشت گوسفندی|Khuzestan ghalieh stew stew with lamb|135|8.4|5|9|خورش قلیه ماهی خوزستانی گوشت گوسفند;گوسفندی
خورش قلیه ماهی خوزستانی با گوشت گوسفندی کم‌روغن|Khuzestan ghalieh stew stew with lamb, low-oil|113|8.4|5|6.6|خورش قلیه ماهی خوزستانی گوشت گوسفند;گوسفندی
خورش قلیه ماهی خوزستانی با گوشت گوسفندی پرروغن رستورانی|Khuzestan ghalieh stew stew with lamb, rich restaurant-style|163|8.4|5|12.2|خورش قلیه ماهی خوزستانی گوشت گوسفند;گوسفندی
خورش قلیه ماهی خوزستانی با گوشت گاو|Khuzestan ghalieh stew stew with beef|123|9|5|7.4|خورش قلیه ماهی خوزستانی گوشت گاو;گوساله
خورش قلیه ماهی خوزستانی با گوشت گاو کم‌روغن|Khuzestan ghalieh stew stew with beef, low-oil|101|9|5|5|خورش قلیه ماهی خوزستانی گوشت گاو;گوساله
خورش قلیه ماهی خوزستانی با گوشت گاو پرروغن رستورانی|Khuzestan ghalieh stew stew with beef, rich restaurant-style|151|9|5|10.6|خورش قلیه ماهی خوزستانی گوشت گاو;گوساله
خورش قلیه ماهی خوزستانی گیاهی (بدون گوشت)|Khuzestan ghalieh stew stew vegetarian|83|4.4|5|5|خورش قلیه ماهی خوزستانی بدون گوشت;وگان
خورش قلیه ماهی خوزستانی گیاهی (بدون گوشت) کم‌روغن|Khuzestan ghalieh stew stew vegetarian, low-oil|61|4.4|5|2.6|خورش قلیه ماهی خوزستانی بدون گوشت;وگان
خورش قلیه ماهی خوزستانی گیاهی (بدون گوشت) پرروغن رستورانی|Khuzestan ghalieh stew stew vegetarian, rich restaurant-style|111|4.4|5|8.2|خورش قلیه ماهی خوزستانی بدون گوشت;وگان
سبزی پلو کم‌روغن|Sabzi polo, low-oil|133|3|26|1.9|سبزی‌پلو
سبزی پلو پرروغن|Sabzi polo, extra-oil|169|3|26|5.9|سبزی‌پلو
سبزی پلو با مرغ|Sabzi polo with chicken|158|8.5|20|4.9|سبزی‌پلو
سبزی پلو با مرغ کم‌روغن|Sabzi polo with chicken, low-oil|147|8.5|20|3.7|سبزی‌پلو
سبزی پلو با مرغ پرروغن|Sabzi polo with chicken, extra-oil|174|8.5|20|6.7|سبزی‌پلو
سبزی پلو با گوشت گوسفندی|Sabzi polo with lamb|173|7.8|19.5|7.1|سبزی‌پلو
سبزی پلو با گوشت گوسفندی کم‌روغن|Sabzi polo with lamb, low-oil|162|7.8|19.5|5.9|سبزی‌پلو
سبزی پلو با گوشت گوسفندی پرروغن|Sabzi polo with lamb, extra-oil|189|7.8|19.5|8.9|سبزی‌پلو
سبزی پلو با گوشت گاو|Sabzi polo with beef|164|8.8|19.5|5.6|سبزی‌پلو
سبزی پلو با گوشت گاو کم‌روغن|Sabzi polo with beef, low-oil|153|8.8|19.5|4.4|سبزی‌پلو
سبزی پلو با گوشت گاو پرروغن|Sabzi polo with beef, extra-oil|180|8.8|19.5|7.4|سبزی‌پلو
سبزی پلو با ماهی|Sabzi polo with fish|159|7.8|20.5|5.1|سبزی‌پلو
سبزی پلو با ماهی کم‌روغن|Sabzi polo with fish, low-oil|148|7.8|20.5|3.9|سبزی‌پلو
سبزی پلو با ماهی پرروغن|Sabzi polo with fish, extra-oil|175|7.8|20.5|6.9|سبزی‌پلو
باقالی پلو کم‌روغن|Baghali polo, low-oil|134|3.6|26|1.7|باقلا پلو
باقالی پلو پرروغن|Baghali polo, extra-oil|170|3.6|26|5.7|باقلا پلو
باقالی پلو با مرغ|Baghali polo with chicken|158|9|20|4.7|باقلا پلو
باقالی پلو با مرغ کم‌روغن|Baghali polo with chicken, low-oil|148|9|20|3.5|باقلا پلو
باقالی پلو با مرغ پرروغن|Baghali polo with chicken, extra-oil|175|9|20|6.5|باقلا پلو
باقالی پلو با گوشت گوسفندی|Baghali polo with lamb|174|8.2|19.5|7|باقلا پلو
باقالی پلو با گوشت گوسفندی کم‌روغن|Baghali polo with lamb, low-oil|163|8.2|19.5|5.8|باقلا پلو
باقالی پلو با گوشت گوسفندی پرروغن|Baghali polo with lamb, extra-oil|190|8.2|19.5|8.8|باقلا پلو
باقالی پلو با گوشت گاو|Baghali polo with beef|164|9.2|19.5|5.5|باقلا پلو
باقالی پلو با گوشت گاو کم‌روغن|Baghali polo with beef, low-oil|154|9.2|19.5|4.3|باقلا پلو
باقالی پلو با گوشت گاو پرروغن|Baghali polo with beef, extra-oil|181|9.2|19.5|7.3|باقلا پلو
باقالی پلو با ماهی|Baghali polo with fish|160|8.2|20.5|5|باقلا پلو
باقالی پلو با ماهی کم‌روغن|Baghali polo with fish, low-oil|149|8.2|20.5|3.8|باقلا پلو
باقالی پلو با ماهی پرروغن|Baghali polo with fish, extra-oil|176|8.2|20.5|6.8|باقلا پلو
شویدپلو کم‌روغن|Shevid polo, low-oil|134|3.2|26|1.9|شوید پلو
شویدپلو پرروغن|Shevid polo, extra-oil|170|3.2|26|5.9|شوید پلو
شویدپلو با مرغ|Shevid polo with chicken|159|8.7|20|4.9|شوید پلو
شویدپلو با مرغ کم‌روغن|Shevid polo with chicken, low-oil|148|8.7|20|3.7|شوید پلو
شویدپلو با مرغ پرروغن|Shevid polo with chicken, extra-oil|175|8.7|20|6.7|شوید پلو
شویدپلو با گوشت گوسفندی|Shevid polo with lamb|174|7.9|19.5|7.1|شوید پلو
شویدپلو با گوشت گوسفندی کم‌روغن|Shevid polo with lamb, low-oil|163|7.9|19.5|5.9|شوید پلو
شویدپلو با گوشت گوسفندی پرروغن|Shevid polo with lamb, extra-oil|190|7.9|19.5|8.9|شوید پلو
شویدپلو با گوشت گاو|Shevid polo with beef|164|8.9|19.5|5.6|شوید پلو
شویدپلو با گوشت گاو کم‌روغن|Shevid polo with beef, low-oil|153|8.9|19.5|4.4|شوید پلو
شویدپلو با گوشت گاو پرروغن|Shevid polo with beef, extra-oil|180|8.9|19.5|7.4|شوید پلو
شویدپلو با ماهی|Shevid polo with fish|160|7.9|20.5|5.1|شوید پلو
شویدپلو با ماهی کم‌روغن|Shevid polo with fish, low-oil|149|7.9|20.5|3.9|شوید پلو
شویدپلو با ماهی پرروغن|Shevid polo with fish, extra-oil|176|7.9|20.5|6.9|شوید پلو
لوبیا پلو کم‌روغن|Lobia polo, low-oil|134|3.5|25|2.2|
لوبیا پلو پرروغن|Lobia polo, extra-oil|170|3.5|25|6.2|
لوبیا پلو با مرغ|Lobia polo with chicken|159|8.9|19.3|5.1|
لوبیا پلو با مرغ کم‌روغن|Lobia polo with chicken, low-oil|148|8.9|19.3|3.9|
لوبیا پلو با مرغ پرروغن|Lobia polo with chicken, extra-oil|175|8.9|19.3|6.9|
لوبیا پلو با گوشت گوسفندی|Lobia polo with lamb|174|8.1|18.8|7.4|
لوبیا پلو با گوشت گوسفندی کم‌روغن|Lobia polo with lamb, low-oil|163|8.1|18.8|6.2|
لوبیا پلو با گوشت گوسفندی پرروغن|Lobia polo with lamb, extra-oil|190|8.1|18.8|9.1|
لوبیا پلو با گوشت گاو|Lobia polo with beef|165|9.1|18.8|5.9|
لوبیا پلو با گوشت گاو کم‌روغن|Lobia polo with beef, low-oil|154|9.1|18.8|4.7|
لوبیا پلو با گوشت گاو پرروغن|Lobia polo with beef, extra-oil|181|9.1|18.8|7.7|
لوبیا پلو با ماهی|Lobia polo with fish|160|8.1|19.8|5.4|
لوبیا پلو با ماهی کم‌روغن|Lobia polo with fish, low-oil|149|8.1|19.8|4.2|
لوبیا پلو با ماهی پرروغن|Lobia polo with fish, extra-oil|176|8.1|19.8|7.2|
عدس‌پلو کم‌روغن|Adas polo, low-oil|141|4|27|1.9|عدس پلو
عدس‌پلو پرروغن|Adas polo, extra-oil|177|4|27|5.9|عدس پلو
عدس‌پلو با مرغ|Adas polo with chicken|165|9.3|20.8|4.9|عدس پلو
عدس‌پلو با مرغ کم‌روغن|Adas polo with chicken, low-oil|154|9.3|20.8|3.7|عدس پلو
عدس‌پلو با مرغ پرروغن|Adas polo with chicken, extra-oil|181|9.3|20.8|6.7|عدس پلو
عدس‌پلو با گوشت گوسفندی|Adas polo with lamb|179|8.5|20.3|7.1|عدس پلو
عدس‌پلو با گوشت گوسفندی کم‌روغن|Adas polo with lamb, low-oil|168|8.5|20.3|5.9|عدس پلو
عدس‌پلو با گوشت گوسفندی پرروغن|Adas polo with lamb, extra-oil|195|8.5|20.3|8.9|عدس پلو
عدس‌پلو با گوشت گاو|Adas polo with beef|170|9.5|20.3|5.6|عدس پلو
عدس‌پلو با گوشت گاو کم‌روغن|Adas polo with beef, low-oil|159|9.5|20.3|4.4|عدس پلو
عدس‌پلو با گوشت گاو پرروغن|Adas polo with beef, extra-oil|186|9.5|20.3|7.4|عدس پلو
عدس‌پلو با ماهی|Adas polo with fish|165|8.5|21.3|5.1|عدس پلو
عدس‌پلو با ماهی کم‌روغن|Adas polo with fish, low-oil|154|8.5|21.3|3.9|عدس پلو
عدس‌پلو با ماهی پرروغن|Adas polo with fish, extra-oil|181|8.5|21.3|6.9|عدس پلو
زرشک پلو کم‌روغن|Zereshk polo, low-oil|137|2.8|27|2|زرشک پلو
زرشک پلو پرروغن|Zereshk polo, extra-oil|173|2.8|27|6|زرشک پلو
زرشک پلو با مرغ کم‌روغن|Zereshk polo with chicken, low-oil|151|8.4|20.8|3.8|زرشک پلو
زرشک پلو با مرغ پرروغن|Zereshk polo with chicken, extra-oil|178|8.4|20.8|6.8|زرشک پلو
زرشک پلو با گوشت گوسفندی|Zereshk polo with lamb|176|7.6|20.3|7.2|زرشک پلو
زرشک پلو با گوشت گوسفندی کم‌روغن|Zereshk polo with lamb, low-oil|166|7.6|20.3|6|زرشک پلو
زرشک پلو با گوشت گوسفندی پرروغن|Zereshk polo with lamb, extra-oil|193|7.6|20.3|9|زرشک پلو
زرشک پلو با گوشت گاو|Zereshk polo with beef|167|8.6|20.3|5.7|زرشک پلو
زرشک پلو با گوشت گاو کم‌روغن|Zereshk polo with beef, low-oil|156|8.6|20.3|4.5|زرشک پلو
زرشک پلو با گوشت گاو پرروغن|Zereshk polo with beef, extra-oil|183|8.6|20.3|7.5|زرشک پلو
زرشک پلو با ماهی|Zereshk polo with fish|162|7.6|21.3|5.2|زرشک پلو
زرشک پلو با ماهی کم‌روغن|Zereshk polo with fish, low-oil|152|7.6|21.3|4|زرشک پلو
زرشک پلو با ماهی پرروغن|Zereshk polo with fish, extra-oil|179|7.6|21.3|7|زرشک پلو
البالو پلو کم‌روغن|Albalu polo, low-oil|147|2.8|29|2.2|آلبالو پلو
البالو پلو پرروغن|Albalu polo, extra-oil|183|2.8|29|6.2|آلبالو پلو
البالو پلو با مرغ|Albalu polo with chicken|169|8.4|22.3|5.1|آلبالو پلو
البالو پلو با مرغ کم‌روغن|Albalu polo with chicken, low-oil|158|8.4|22.3|3.9|آلبالو پلو
البالو پلو با مرغ پرروغن|Albalu polo with chicken, extra-oil|185|8.4|22.3|6.9|آلبالو پلو
البالو پلو با گوشت گوسفندی|Albalu polo with lamb|184|7.6|21.8|7.4|آلبالو پلو
البالو پلو با گوشت گوسفندی کم‌روغن|Albalu polo with lamb, low-oil|173|7.6|21.8|6.2|آلبالو پلو
البالو پلو با گوشت گوسفندی پرروغن|Albalu polo with lamb, extra-oil|200|7.6|21.8|9.1|آلبالو پلو
البالو پلو با گوشت گاو|Albalu polo with beef|175|8.6|21.8|5.9|آلبالو پلو
البالو پلو با گوشت گاو کم‌روغن|Albalu polo with beef, low-oil|164|8.6|21.8|4.7|آلبالو پلو
البالو پلو با گوشت گاو پرروغن|Albalu polo with beef, extra-oil|191|8.6|21.8|7.7|آلبالو پلو
البالو پلو با ماهی|Albalu polo with fish|170|7.6|22.8|5.4|آلبالو پلو
البالو پلو با ماهی کم‌روغن|Albalu polo with fish, low-oil|159|7.6|22.8|4.2|آلبالو پلو
البالو پلو با ماهی پرروغن|Albalu polo with fish, extra-oil|186|7.6|22.8|7.2|آلبالو پلو
استانبولی پلو|Estanboli polo|153|3|25|4.5|
استانبولی پلو کم‌روغن|Estanboli polo, low-oil|138|3|25|2.9|
استانبولی پلو پرروغن|Estanboli polo, extra-oil|174|3|25|6.9|
استانبولی پلو با مرغ|Estanboli polo with chicken|162|8.5|19.3|5.6|
استانبولی پلو با مرغ کم‌روغن|Estanboli polo with chicken, low-oil|151|8.5|19.3|4.4|
استانبولی پلو با مرغ پرروغن|Estanboli polo with chicken, extra-oil|178|8.5|19.3|7.4|
استانبولی پلو با گوشت گوسفندی|Estanboli polo with lamb|178|7.8|18.8|7.9|
استانبولی پلو با گوشت گوسفندی کم‌روغن|Estanboli polo with lamb, low-oil|167|7.8|18.8|6.7|
استانبولی پلو با گوشت گوسفندی پرروغن|Estanboli polo with lamb, extra-oil|194|7.8|18.8|9.7|
استانبولی پلو با گوشت گاو|Estanboli polo with beef|168|8.8|18.8|6.4|
استانبولی پلو با گوشت گاو کم‌روغن|Estanboli polo with beef, low-oil|157|8.8|18.8|5.2|
استانبولی پلو با گوشت گاو پرروغن|Estanboli polo with beef, extra-oil|184|8.8|18.8|8.2|
استانبولی پلو با ماهی|Estanboli polo with fish|164|7.8|19.8|5.9|
استانبولی پلو با ماهی کم‌روغن|Estanboli polo with fish, low-oil|153|7.8|19.8|4.7|
استانبولی پلو با ماهی پرروغن|Estanboli polo with fish, extra-oil|180|7.8|19.8|7.7|
کلم پلو کم‌روغن|Kalam polo, low-oil|127|3.2|24|2|کلم پلو شیرازی
کلم پلو پرروغن|Kalam polo, extra-oil|163|3.2|24|6|کلم پلو شیرازی
کلم پلو با مرغ|Kalam polo with chicken|154|8.7|18.5|5|کلم پلو شیرازی
کلم پلو با مرغ کم‌روغن|Kalam polo with chicken, low-oil|143|8.7|18.5|3.8|کلم پلو شیرازی
کلم پلو با مرغ پرروغن|Kalam polo with chicken, extra-oil|170|8.7|18.5|6.8|کلم پلو شیرازی
کلم پلو با گوشت گوسفندی|Kalam polo with lamb|168|7.9|18|7.2|کلم پلو شیرازی
کلم پلو با گوشت گوسفندی کم‌روغن|Kalam polo with lamb, low-oil|158|7.9|18|6|کلم پلو شیرازی
کلم پلو با گوشت گوسفندی پرروغن|Kalam polo with lamb, extra-oil|185|7.9|18|9|کلم پلو شیرازی
کلم پلو با گوشت گاو|Kalam polo with beef|159|8.9|18|5.7|کلم پلو شیرازی
کلم پلو با گوشت گاو کم‌روغن|Kalam polo with beef, low-oil|148|8.9|18|4.5|کلم پلو شیرازی
کلم پلو با گوشت گاو پرروغن|Kalam polo with beef, extra-oil|175|8.9|18|7.5|کلم پلو شیرازی
کلم پلو با ماهی|Kalam polo with fish|154|7.9|19|5.2|کلم پلو شیرازی
کلم پلو با ماهی کم‌روغن|Kalam polo with fish, low-oil|144|7.9|19|4|کلم پلو شیرازی
کلم پلو با ماهی پرروغن|Kalam polo with fish, extra-oil|171|7.9|19|7|کلم پلو شیرازی
هویج پلو کم‌روغن|Havij polo, low-oil|136|2.8|27|1.9|هویج پلو
هویج پلو پرروغن|Havij polo, extra-oil|172|2.8|27|5.9|هویج پلو
هویج پلو با مرغ|Havij polo with chicken|161|8.4|20.8|4.9|هویج پلو
هویج پلو با مرغ کم‌روغن|Havij polo with chicken, low-oil|150|8.4|20.8|3.7|هویج پلو
هویج پلو با مرغ پرروغن|Havij polo with chicken, extra-oil|177|8.4|20.8|6.7|هویج پلو
هویج پلو با گوشت گوسفندی|Havij polo with lamb|176|7.6|20.3|7.1|هویج پلو
هویج پلو با گوشت گوسفندی کم‌روغن|Havij polo with lamb, low-oil|165|7.6|20.3|5.9|هویج پلو
هویج پلو با گوشت گوسفندی پرروغن|Havij polo with lamb, extra-oil|192|7.6|20.3|8.9|هویج پلو
هویج پلو با گوشت گاو|Havij polo with beef|166|8.6|20.3|5.6|هویج پلو
هویج پلو با گوشت گاو کم‌روغن|Havij polo with beef, low-oil|155|8.6|20.3|4.4|هویج پلو
هویج پلو با گوشت گاو پرروغن|Havij polo with beef, extra-oil|182|8.6|20.3|7.4|هویج پلو
هویج پلو با ماهی|Havij polo with fish|162|7.6|21.3|5.1|هویج پلو
هویج پلو با ماهی کم‌روغن|Havij polo with fish, low-oil|151|7.6|21.3|3.9|هویج پلو
هویج پلو با ماهی پرروغن|Havij polo with fish, extra-oil|178|7.6|21.3|6.9|هویج پلو
شیرین پلو کم‌روغن|Shirin polo, low-oil|151|3|29|2.6|
شیرین پلو پرروغن|Shirin polo, extra-oil|187|3|29|6.6|
شیرین پلو با مرغ|Shirin polo with chicken|172|8.5|22.3|5.4|
شیرین پلو با مرغ کم‌روغن|Shirin polo with chicken, low-oil|161|8.5|22.3|4.2|
شیرین پلو با مرغ پرروغن|Shirin polo with chicken, extra-oil|188|8.5|22.3|7.2|
شیرین پلو با گوشت گوسفندی|Shirin polo with lamb|188|7.8|21.8|7.7|
شیرین پلو با گوشت گوسفندی کم‌روغن|Shirin polo with lamb, low-oil|177|7.8|21.8|6.5|
شیرین پلو با گوشت گوسفندی پرروغن|Shirin polo with lamb, extra-oil|204|7.8|21.8|9.5|
شیرین پلو با گوشت گاو|Shirin polo with beef|178|8.8|21.8|6.2|
شیرین پلو با گوشت گاو کم‌روغن|Shirin polo with beef, low-oil|167|8.8|21.8|5|
شیرین پلو با گوشت گاو پرروغن|Shirin polo with beef, extra-oil|194|8.8|21.8|8|
شیرین پلو با ماهی|Shirin polo with fish|174|7.8|22.8|5.7|
شیرین پلو با ماهی کم‌روغن|Shirin polo with fish, low-oil|163|7.8|22.8|4.5|
شیرین پلو با ماهی پرروغن|Shirin polo with fish, extra-oil|190|7.8|22.8|7.5|
مرصع پلو کم‌روغن|Morasa polo, low-oil|160|3.4|29|3.4|
مرصع پلو پرروغن|Morasa polo, extra-oil|196|3.4|29|7.4|
مرصع پلو با مرغ|Morasa polo with chicken|178|8.8|22.3|6|
مرصع پلو با مرغ کم‌روغن|Morasa polo with chicken, low-oil|168|8.8|22.3|4.8|
مرصع پلو با مرغ پرروغن|Morasa polo with chicken, extra-oil|195|8.8|22.3|7.8|
مرصع پلو با گوشت گوسفندی|Morasa polo with lamb|194|8.1|21.8|8.3|
مرصع پلو با گوشت گوسفندی کم‌روغن|Morasa polo with lamb, low-oil|184|8.1|21.8|7.1|
مرصع پلو با گوشت گوسفندی پرروغن|Morasa polo with lamb, extra-oil|211|8.1|21.8|10.1|
مرصع پلو با گوشت گاو|Morasa polo with beef|185|9.1|21.8|6.8|
مرصع پلو با گوشت گاو کم‌روغن|Morasa polo with beef, low-oil|174|9.1|21.8|5.6|
مرصع پلو با گوشت گاو پرروغن|Morasa polo with beef, extra-oil|201|9.1|21.8|8.6|
مرصع پلو با ماهی|Morasa polo with fish|180|8.1|22.8|6.3|
مرصع پلو با ماهی کم‌روغن|Morasa polo with fish, low-oil|170|8.1|22.8|5.1|
مرصع پلو با ماهی پرروغن|Morasa polo with fish, extra-oil|197|8.1|22.8|8.1|
جواهر پلو|Javaher polo|172|3.2|29|4.8|جواهری پلو
جواهر پلو کم‌روغن|Javaher polo, low-oil|158|3.2|29|3.2|جواهری پلو
جواهر پلو پرروغن|Javaher polo, extra-oil|194|3.2|29|7.2|جواهری پلو
جواهر پلو با مرغ|Javaher polo with chicken|177|8.7|22.3|5.9|جواهری پلو
جواهر پلو با مرغ کم‌روغن|Javaher polo with chicken, low-oil|166|8.7|22.3|4.7|جواهری پلو
جواهر پلو با مرغ پرروغن|Javaher polo with chicken, extra-oil|193|8.7|22.3|7.7|جواهری پلو
جواهر پلو با گوشت گوسفندی|Javaher polo with lamb|192|7.9|21.8|8.1|جواهری پلو
جواهر پلو با گوشت گوسفندی کم‌روغن|Javaher polo with lamb, low-oil|181|7.9|21.8|6.9|جواهری پلو
جواهر پلو با گوشت گوسفندی پرروغن|Javaher polo with lamb, extra-oil|208|7.9|21.8|9.9|جواهری پلو
جواهر پلو با گوشت گاو|Javaher polo with beef|182|8.9|21.8|6.6|جواهری پلو
جواهر پلو با گوشت گاو کم‌روغن|Javaher polo with beef, low-oil|171|8.9|21.8|5.4|جواهری پلو
جواهر پلو با گوشت گاو پرروغن|Javaher polo with beef, extra-oil|198|8.9|21.8|8.4|جواهری پلو
جواهر پلو با ماهی|Javaher polo with fish|178|7.9|22.8|6.1|جواهری پلو
جواهر پلو با ماهی کم‌روغن|Javaher polo with fish, low-oil|167|7.9|22.8|4.9|جواهری پلو
جواهر پلو با ماهی پرروغن|Javaher polo with fish, extra-oil|194|7.9|22.8|7.9|جواهری پلو
عدس پلو با خرما|Adas polo with dates|173|3.8|31|3.8|
عدس پلو با خرما کم‌روغن|Adas polo with dates, low-oil|159|3.8|31|2.2|
عدس پلو با خرما پرروغن|Adas polo with dates, extra-oil|195|3.8|31|6.2|
عدس پلو با خرما با مرغ|Adas polo with dates with chicken|178|9.1|23.8|5.1|
عدس پلو با خرما با مرغ کم‌روغن|Adas polo with dates with chicken, low-oil|167|9.1|23.8|3.9|
عدس پلو با خرما با مرغ پرروغن|Adas polo with dates with chicken, extra-oil|194|9.1|23.8|6.9|
عدس پلو با خرما با گوشت گوسفندی|Adas polo with dates with lamb|193|8.4|23.3|7.4|
عدس پلو با خرما با گوشت گوسفندی کم‌روغن|Adas polo with dates with lamb, low-oil|183|8.4|23.3|6.2|
عدس پلو با خرما با گوشت گوسفندی پرروغن|Adas polo with dates with lamb, extra-oil|209|8.4|23.3|9.1|
عدس پلو با خرما با گوشت گاو|Adas polo with dates with beef|184|9.4|23.3|5.9|
عدس پلو با خرما با گوشت گاو کم‌روغن|Adas polo with dates with beef, low-oil|173|9.4|23.3|4.7|
عدس پلو با خرما با گوشت گاو پرروغن|Adas polo with dates with beef, extra-oil|200|9.4|23.3|7.7|
عدس پلو با خرما با ماهی|Adas polo with dates with fish|179|8.4|24.3|5.4|
عدس پلو با خرما با ماهی کم‌روغن|Adas polo with dates with fish, low-oil|169|8.4|24.3|4.2|
عدس پلو با خرما با ماهی پرروغن|Adas polo with dates with fish, extra-oil|196|8.4|24.3|7.2|
دمپخت|Dampokht|151|3.8|26|3.5|دم پخت
دمپخت کم‌روغن|Dampokht, low-oil|136|3.8|26|1.9|دم پخت
دمپخت پرروغن|Dampokht, extra-oil|172|3.8|26|5.9|دم پخت
دمپخت با مرغ|Dampokht with chicken|161|9.1|20|4.9|دم پخت
دمپخت با مرغ کم‌روغن|Dampokht with chicken, low-oil|150|9.1|20|3.7|دم پخت
دمپخت با مرغ پرروغن|Dampokht with chicken, extra-oil|177|9.1|20|6.7|دم پخت
دمپخت با گوشت گوسفندی|Dampokht with lamb|176|8.4|19.5|7.1|دم پخت
دمپخت با گوشت گوسفندی کم‌روغن|Dampokht with lamb, low-oil|165|8.4|19.5|5.9|دم پخت
دمپخت با گوشت گوسفندی پرروغن|Dampokht with lamb, extra-oil|192|8.4|19.5|8.9|دم پخت
دمپخت با گوشت گاو|Dampokht with beef|166|9.4|19.5|5.6|دم پخت
دمپخت با گوشت گاو کم‌روغن|Dampokht with beef, low-oil|155|9.4|19.5|4.4|دم پخت
دمپخت با گوشت گاو پرروغن|Dampokht with beef, extra-oil|182|9.4|19.5|7.4|دم پخت
دمپخت با ماهی|Dampokht with fish|162|8.4|20.5|5.1|دم پخت
دمپخت با ماهی کم‌روغن|Dampokht with fish, low-oil|151|8.4|20.5|3.9|دم پخت
دمپخت با ماهی پرروغن|Dampokht with fish, extra-oil|178|8.4|20.5|6.9|دم پخت
لپه پلو|Lapeh polo|152|4|26|3.5|
لپه پلو کم‌روغن|Lapeh polo, low-oil|137|4|26|1.9|
لپه پلو پرروغن|Lapeh polo, extra-oil|173|4|26|5.9|
لپه پلو با مرغ|Lapeh polo with chicken|161|9.3|20|4.9|
لپه پلو با مرغ کم‌روغن|Lapeh polo with chicken, low-oil|151|9.3|20|3.7|
لپه پلو با مرغ پرروغن|Lapeh polo with chicken, extra-oil|178|9.3|20|6.7|
لپه پلو با گوشت گوسفندی|Lapeh polo with lamb|176|8.5|19.5|7.1|
لپه پلو با گوشت گوسفندی کم‌روغن|Lapeh polo with lamb, low-oil|165|8.5|19.5|5.9|
لپه پلو با گوشت گوسفندی پرروغن|Lapeh polo with lamb, extra-oil|192|8.5|19.5|8.9|
لپه پلو با گوشت گاو|Lapeh polo with beef|166|9.5|19.5|5.6|
لپه پلو با گوشت گاو کم‌روغن|Lapeh polo with beef, low-oil|156|9.5|19.5|4.4|
لپه پلو با گوشت گاو پرروغن|Lapeh polo with beef, extra-oil|183|9.5|19.5|7.4|
لپه پلو با ماهی|Lapeh polo with fish|162|8.5|20.5|5.1|
لپه پلو با ماهی کم‌روغن|Lapeh polo with fish, low-oil|151|8.5|20.5|3.9|
لپه پلو با ماهی پرروغن|Lapeh polo with fish, extra-oil|178|8.5|20.5|6.9|
ماش پلو کم‌روغن|Mash polo, low-oil|134|4|26|1.6|
ماش پلو پرروغن|Mash polo, extra-oil|170|4|26|5.6|
ماش پلو با مرغ|Mash polo with chicken|160|9.3|20|4.7|
ماش پلو با مرغ کم‌روغن|Mash polo with chicken, low-oil|149|9.3|20|3.5|
ماش پلو با مرغ پرروغن|Mash polo with chicken, extra-oil|176|9.3|20|6.5|
ماش پلو با گوشت گوسفندی|Mash polo with lamb|174|8.5|19.5|6.9|
ماش پلو با گوشت گوسفندی کم‌روغن|Mash polo with lamb, low-oil|163|8.5|19.5|5.7|
ماش پلو با گوشت گوسفندی پرروغن|Mash polo with lamb, extra-oil|190|8.5|19.5|8.7|
ماش پلو با گوشت گاو|Mash polo with beef|165|9.5|19.5|5.4|
ماش پلو با گوشت گاو کم‌روغن|Mash polo with beef, low-oil|154|9.5|19.5|4.2|
ماش پلو با گوشت گاو پرروغن|Mash polo with beef, extra-oil|181|9.5|19.5|7.2|
ماش پلو با ماهی|Mash polo with fish|160|8.5|20.5|4.9|
ماش پلو با ماهی کم‌روغن|Mash polo with fish, low-oil|149|8.5|20.5|3.7|
ماش پلو با ماهی پرروغن|Mash polo with fish, extra-oil|176|8.5|20.5|6.7|
نخودچی پلو|Nokhodchi polo|152|4|26|3.5|
نخودچی پلو کم‌روغن|Nokhodchi polo, low-oil|137|4|26|1.9|
نخودچی پلو پرروغن|Nokhodchi polo, extra-oil|173|4|26|5.9|
نخودچی پلو با مرغ|Nokhodchi polo with chicken|161|9.3|20|4.9|
نخودچی پلو با مرغ کم‌روغن|Nokhodchi polo with chicken, low-oil|151|9.3|20|3.7|
نخودچی پلو با مرغ پرروغن|Nokhodchi polo with chicken, extra-oil|178|9.3|20|6.7|
نخودچی پلو با گوشت گوسفندی|Nokhodchi polo with lamb|176|8.5|19.5|7.1|
نخودچی پلو با گوشت گوسفندی کم‌روغن|Nokhodchi polo with lamb, low-oil|165|8.5|19.5|5.9|
نخودچی پلو با گوشت گوسفندی پرروغن|Nokhodchi polo with lamb, extra-oil|192|8.5|19.5|8.9|
نخودچی پلو با گوشت گاو|Nokhodchi polo with beef|166|9.5|19.5|5.6|
نخودچی پلو با گوشت گاو کم‌روغن|Nokhodchi polo with beef, low-oil|156|9.5|19.5|4.4|
نخودچی پلو با گوشت گاو پرروغن|Nokhodchi polo with beef, extra-oil|183|9.5|19.5|7.4|
نخودچی پلو با ماهی|Nokhodchi polo with fish|162|8.5|20.5|5.1|
نخودچی پلو با ماهی کم‌روغن|Nokhodchi polo with fish, low-oil|151|8.5|20.5|3.9|
نخودچی پلو با ماهی پرروغن|Nokhodchi polo with fish, extra-oil|178|8.5|20.5|6.9|
کدو پلو|Kadoo polo|146|2.6|26|3.5|
کدو پلو کم‌روغن|Kadoo polo, low-oil|132|2.6|26|1.9|
کدو پلو پرروغن|Kadoo polo, extra-oil|168|2.6|26|5.9|
کدو پلو با مرغ|Kadoo polo with chicken|157|8.2|20|4.9|
کدو پلو با مرغ کم‌روغن|Kadoo polo with chicken, low-oil|146|8.2|20|3.7|
کدو پلو با مرغ پرروغن|Kadoo polo with chicken, extra-oil|173|8.2|20|6.7|
کدو پلو با گوشت گوسفندی|Kadoo polo with lamb|172|7.5|19.5|7.1|
کدو پلو با گوشت گوسفندی کم‌روغن|Kadoo polo with lamb, low-oil|161|7.5|19.5|5.9|
کدو پلو با گوشت گوسفندی پرروغن|Kadoo polo with lamb, extra-oil|188|7.5|19.5|8.9|
کدو پلو با گوشت گاو|Kadoo polo with beef|162|8.5|19.5|5.6|
کدو پلو با گوشت گاو کم‌روغن|Kadoo polo with beef, low-oil|152|8.5|19.5|4.4|
کدو پلو با گوشت گاو پرروغن|Kadoo polo with beef, extra-oil|179|8.5|19.5|7.4|
کدو پلو با ماهی|Kadoo polo with fish|158|7.5|20.5|5.1|
کدو پلو با ماهی کم‌روغن|Kadoo polo with fish, low-oil|147|7.5|20.5|3.9|
کدو پلو با ماهی پرروغن|Kadoo polo with fish, extra-oil|174|7.5|20.5|6.9|
گوجه پلو|Gojeh polo|149|2.8|26|3.8|
گوجه پلو کم‌روغن|Gojeh polo, low-oil|135|2.8|26|2.2|
گوجه پلو پرروغن|Gojeh polo, extra-oil|171|2.8|26|6.2|
گوجه پلو با مرغ|Gojeh polo with chicken|160|8.4|20|5.1|
گوجه پلو با مرغ کم‌روغن|Gojeh polo with chicken, low-oil|149|8.4|20|3.9|
گوجه پلو با مرغ پرروغن|Gojeh polo with chicken, extra-oil|176|8.4|20|6.9|
گوجه پلو با گوشت گوسفندی|Gojeh polo with lamb|175|7.6|19.5|7.4|
گوجه پلو با گوشت گوسفندی کم‌روغن|Gojeh polo with lamb, low-oil|164|7.6|19.5|6.2|
گوجه پلو با گوشت گوسفندی پرروغن|Gojeh polo with lamb, extra-oil|190|7.6|19.5|9.1|
گوجه پلو با گوشت گاو|Gojeh polo with beef|166|8.6|19.5|5.9|
گوجه پلو با گوشت گاو کم‌روغن|Gojeh polo with beef, low-oil|155|8.6|19.5|4.7|
گوجه پلو با گوشت گاو پرروغن|Gojeh polo with beef, extra-oil|182|8.6|19.5|7.7|
گوجه پلو با ماهی|Gojeh polo with fish|161|7.6|20.5|5.4|
گوجه پلو با ماهی کم‌روغن|Gojeh polo with fish, low-oil|150|7.6|20.5|4.2|
گوجه پلو با ماهی پرروغن|Gojeh polo with fish, extra-oil|177|7.6|20.5|7.2|
بادمجان پلو|Bademjan polo|152|2.8|25|4.5|
بادمجان پلو کم‌روغن|Bademjan polo, low-oil|137|2.8|25|2.9|
بادمجان پلو پرروغن|Bademjan polo, extra-oil|173|2.8|25|6.9|
بادمجان پلو با مرغ|Bademjan polo with chicken|161|8.4|19.3|5.6|
بادمجان پلو با مرغ کم‌روغن|Bademjan polo with chicken, low-oil|150|8.4|19.3|4.4|
بادمجان پلو با مرغ پرروغن|Bademjan polo with chicken, extra-oil|177|8.4|19.3|7.4|
بادمجان پلو با گوشت گوسفندی|Bademjan polo with lamb|177|7.6|18.8|7.9|
بادمجان پلو با گوشت گوسفندی کم‌روغن|Bademjan polo with lamb, low-oil|166|7.6|18.8|6.7|
بادمجان پلو با گوشت گوسفندی پرروغن|Bademjan polo with lamb, extra-oil|193|7.6|18.8|9.7|
بادمجان پلو با گوشت گاو|Bademjan polo with beef|167|8.6|18.8|6.4|
بادمجان پلو با گوشت گاو کم‌روغن|Bademjan polo with beef, low-oil|156|8.6|18.8|5.2|
بادمجان پلو با گوشت گاو پرروغن|Bademjan polo with beef, extra-oil|183|8.6|18.8|8.2|
بادمجان پلو با ماهی|Bademjan polo with fish|163|7.6|19.8|5.9|
بادمجان پلو با ماهی کم‌روغن|Bademjan polo with fish, low-oil|152|7.6|19.8|4.7|
بادمجان پلو با ماهی پرروغن|Bademjan polo with fish, extra-oil|179|7.6|19.8|7.7|
قارچ پلو|Mushroom polo|149|3.2|25|4|
قارچ پلو کم‌روغن|Mushroom polo, low-oil|134|3.2|25|2.4|
قارچ پلو پرروغن|Mushroom polo, extra-oil|170|3.2|25|6.4|
قارچ پلو با مرغ|Mushroom polo with chicken|160|8.7|19.3|5.3|
قارچ پلو با مرغ کم‌روغن|Mushroom polo with chicken, low-oil|149|8.7|19.3|4.1|
قارچ پلو با مرغ پرروغن|Mushroom polo with chicken, extra-oil|176|8.7|19.3|7.1|
قارچ پلو با گوشت گوسفندی|Mushroom polo with lamb|174|7.9|18.8|7.5|
قارچ پلو با گوشت گوسفندی کم‌روغن|Mushroom polo with lamb, low-oil|164|7.9|18.8|6.3|
قارچ پلو با گوشت گوسفندی پرروغن|Mushroom polo with lamb, extra-oil|191|7.9|18.8|9.3|
قارچ پلو با گوشت گاو|Mushroom polo with beef|165|8.9|18.8|6|
قارچ پلو با گوشت گاو کم‌روغن|Mushroom polo with beef, low-oil|154|8.9|18.8|4.8|
قارچ پلو با گوشت گاو پرروغن|Mushroom polo with beef, extra-oil|181|8.9|18.8|7.8|
قارچ پلو با ماهی|Mushroom polo with fish|160|7.9|19.8|5.5|
قارچ پلو با ماهی کم‌روغن|Mushroom polo with fish, low-oil|150|7.9|19.8|4.3|
قارچ پلو با ماهی پرروغن|Mushroom polo with fish, extra-oil|177|7.9|19.8|7.3|
نارنج پلو|Narenj polo|160|3|28|4|نارنج‌پلو
نارنج پلو کم‌روغن|Narenj polo, low-oil|146|3|28|2.4|نارنج‌پلو
نارنج پلو پرروغن|Narenj polo, extra-oil|182|3|28|6.4|نارنج‌پلو
نارنج پلو با مرغ|Narenj polo with chicken|168|8.5|21.5|5.3|نارنج‌پلو
نارنج پلو با مرغ کم‌روغن|Narenj polo with chicken, low-oil|157|8.5|21.5|4.1|نارنج‌پلو
نارنج پلو با مرغ پرروغن|Narenj polo with chicken, extra-oil|184|8.5|21.5|7.1|نارنج‌پلو
نارنج پلو با گوشت گوسفندی|Narenj polo with lamb|183|7.8|21|7.5|نارنج‌پلو
نارنج پلو با گوشت گوسفندی کم‌روغن|Narenj polo with lamb, low-oil|172|7.8|21|6.3|نارنج‌پلو
نارنج پلو با گوشت گوسفندی پرروغن|Narenj polo with lamb, extra-oil|199|7.8|21|9.3|نارنج‌پلو
نارنج پلو با گوشت گاو|Narenj polo with beef|173|8.8|21|6|نارنج‌پلو
نارنج پلو با گوشت گاو کم‌روغن|Narenj polo with beef, low-oil|162|8.8|21|4.8|نارنج‌پلو
نارنج پلو با گوشت گاو پرروغن|Narenj polo with beef, extra-oil|189|8.8|21|7.8|نارنج‌پلو
نارنج پلو با ماهی|Narenj polo with fish|169|7.8|22|5.5|نارنج‌پلو
نارنج پلو با ماهی کم‌روغن|Narenj polo with fish, low-oil|158|7.8|22|4.3|نارنج‌پلو
نارنج پلو با ماهی پرروغن|Narenj polo with fish, extra-oil|185|7.8|22|7.3|نارنج‌پلو
سیب پلو|Apple polo|157|2.8|28|3.8|
سیب پلو کم‌روغن|Apple polo, low-oil|143|2.8|28|2.2|
سیب پلو پرروغن|Apple polo, extra-oil|179|2.8|28|6.2|
سیب پلو با مرغ|Apple polo with chicken|166|8.4|21.5|5.1|
سیب پلو با مرغ کم‌روغن|Apple polo with chicken, low-oil|155|8.4|21.5|3.9|
سیب پلو با مرغ پرروغن|Apple polo with chicken, extra-oil|182|8.4|21.5|6.9|
سیب پلو با گوشت گوسفندی|Apple polo with lamb|181|7.6|21|7.4|
سیب پلو با گوشت گوسفندی کم‌روغن|Apple polo with lamb, low-oil|170|7.6|21|6.2|
سیب پلو با گوشت گوسفندی پرروغن|Apple polo with lamb, extra-oil|196|7.6|21|9.1|
سیب پلو با گوشت گاو|Apple polo with beef|172|8.6|21|5.9|
سیب پلو با گوشت گاو کم‌روغن|Apple polo with beef, low-oil|161|8.6|21|4.7|
سیب پلو با گوشت گاو پرروغن|Apple polo with beef, extra-oil|188|8.6|21|7.7|
سیب پلو با ماهی|Apple polo with fish|167|7.6|22|5.4|
سیب پلو با ماهی کم‌روغن|Apple polo with fish, low-oil|156|7.6|22|4.2|
سیب پلو با ماهی پرروغن|Apple polo with fish, extra-oil|183|7.6|22|7.2|
انار پلو|Anar polo|161|2.8|29|3.8|
انار پلو کم‌روغن|Anar polo, low-oil|147|2.8|29|2.2|
انار پلو پرروغن|Anar polo, extra-oil|183|2.8|29|6.2|
انار پلو با مرغ|Anar polo with chicken|169|8.4|22.3|5.1|
انار پلو با مرغ کم‌روغن|Anar polo with chicken, low-oil|158|8.4|22.3|3.9|
انار پلو با مرغ پرروغن|Anar polo with chicken, extra-oil|185|8.4|22.3|6.9|
انار پلو با گوشت گوسفندی|Anar polo with lamb|184|7.6|21.8|7.4|
انار پلو با گوشت گوسفندی کم‌روغن|Anar polo with lamb, low-oil|173|7.6|21.8|6.2|
انار پلو با گوشت گوسفندی پرروغن|Anar polo with lamb, extra-oil|200|7.6|21.8|9.1|
انار پلو با گوشت گاو|Anar polo with beef|175|8.6|21.8|5.9|
انار پلو با گوشت گاو کم‌روغن|Anar polo with beef, low-oil|164|8.6|21.8|4.7|
انار پلو با گوشت گاو پرروغن|Anar polo with beef, extra-oil|191|8.6|21.8|7.7|
انار پلو با ماهی|Anar polo with fish|170|7.6|22.8|5.4|
انار پلو با ماهی کم‌روغن|Anar polo with fish, low-oil|159|7.6|22.8|4.2|
انار پلو با ماهی پرروغن|Anar polo with fish, extra-oil|186|7.6|22.8|7.2|
اسفناج پلو|Spinach polo|145|3.2|25|3.6|
اسفناج پلو کم‌روغن|Spinach polo, low-oil|131|3.2|25|2|
اسفناج پلو پرروغن|Spinach polo, extra-oil|167|3.2|25|6|
اسفناج پلو با مرغ|Spinach polo with chicken|157|8.7|19.3|5|
اسفناج پلو با مرغ کم‌روغن|Spinach polo with chicken, low-oil|146|8.7|19.3|3.8|
اسفناج پلو با مرغ پرروغن|Spinach polo with chicken, extra-oil|173|8.7|19.3|6.8|
اسفناج پلو با گوشت گوسفندی|Spinach polo with lamb|172|7.9|18.8|7.2|
اسفناج پلو با گوشت گوسفندی کم‌روغن|Spinach polo with lamb, low-oil|161|7.9|18.8|6|
اسفناج پلو با گوشت گوسفندی پرروغن|Spinach polo with lamb, extra-oil|188|7.9|18.8|9|
اسفناج پلو با گوشت گاو|Spinach polo with beef|162|8.9|18.8|5.7|
اسفناج پلو با گوشت گاو کم‌روغن|Spinach polo with beef, low-oil|151|8.9|18.8|4.5|
اسفناج پلو با گوشت گاو پرروغن|Spinach polo with beef, extra-oil|178|8.9|18.8|7.5|
اسفناج پلو با ماهی|Spinach polo with fish|158|7.9|19.8|5.2|
اسفناج پلو با ماهی کم‌روغن|Spinach polo with fish, low-oil|147|7.9|19.8|4|
اسفناج پلو با ماهی پرروغن|Spinach polo with fish, extra-oil|174|7.9|19.8|7|
شاه پلو|Shah polo|167|3.5|28|4.5|
شاه پلو کم‌روغن|Shah polo, low-oil|152|3.5|28|2.9|
شاه پلو پرروغن|Shah polo, extra-oil|188|3.5|28|6.9|
شاه پلو با مرغ|Shah polo with chicken|172|8.9|21.5|5.6|
شاه پلو با مرغ کم‌روغن|Shah polo with chicken, low-oil|161|8.9|21.5|4.4|
شاه پلو با مرغ پرروغن|Shah polo with chicken, extra-oil|188|8.9|21.5|7.4|
شاه پلو با گوشت گوسفندی|Shah polo with lamb|188|8.1|21|7.9|
شاه پلو با گوشت گوسفندی کم‌روغن|Shah polo with lamb, low-oil|177|8.1|21|6.7|
شاه پلو با گوشت گوسفندی پرروغن|Shah polo with lamb, extra-oil|204|8.1|21|9.7|
شاه پلو با گوشت گاو|Shah polo with beef|178|9.1|21|6.4|
شاه پلو با گوشت گاو کم‌روغن|Shah polo with beef, low-oil|167|9.1|21|5.2|
شاه پلو با گوشت گاو پرروغن|Shah polo with beef, extra-oil|194|9.1|21|8.2|
شاه پلو با ماهی|Shah polo with fish|174|8.1|22|5.9|
شاه پلو با ماهی کم‌روغن|Shah polo with fish, low-oil|163|8.1|22|4.7|
شاه پلو با ماهی پرروغن|Shah polo with fish, extra-oil|190|8.1|22|7.7|
کرمانی پلو|Kermani polo|158|3.4|27|4|
کرمانی پلو کم‌روغن|Kermani polo, low-oil|143|3.4|27|2.4|
کرمانی پلو پرروغن|Kermani polo, extra-oil|179|3.4|27|6.4|
کرمانی پلو با مرغ|Kermani polo with chicken|166|8.8|20.8|5.3|
کرمانی پلو با مرغ کم‌روغن|Kermani polo with chicken, low-oil|155|8.8|20.8|4.1|
کرمانی پلو با مرغ پرروغن|Kermani polo with chicken, extra-oil|182|8.8|20.8|7.1|
کرمانی پلو با گوشت گوسفندی|Kermani polo with lamb|181|8.1|20.3|7.5|
کرمانی پلو با گوشت گوسفندی کم‌روغن|Kermani polo with lamb, low-oil|170|8.1|20.3|6.3|
کرمانی پلو با گوشت گوسفندی پرروغن|Kermani polo with lamb, extra-oil|197|8.1|20.3|9.3|
کرمانی پلو با گوشت گاو|Kermani polo with beef|172|9.1|20.3|6|
کرمانی پلو با گوشت گاو کم‌روغن|Kermani polo with beef, low-oil|161|9.1|20.3|4.8|
کرمانی پلو با گوشت گاو پرروغن|Kermani polo with beef, extra-oil|188|9.1|20.3|7.8|
کرمانی پلو با ماهی|Kermani polo with fish|167|8.1|21.3|5.5|
کرمانی پلو با ماهی کم‌روغن|Kermani polo with fish, low-oil|156|8.1|21.3|4.3|
کرمانی پلو با ماهی پرروغن|Kermani polo with fish, extra-oil|183|8.1|21.3|7.3|
ته‌‌چین ساده|Plain tahchin|178|5|27|5.5|
ته‌‌چین ساده کم‌روغن|Plain tahchin, low-oil|163|5|27|3.9|
ته‌‌چین ساده پرروغن|Plain tahchin, extra-oil|199|5|27|7.9|
ته‌‌چین ساده با مرغ|Plain tahchin with chicken|181|10|20.8|6.4|
ته‌‌چین ساده با مرغ کم‌روغن|Plain tahchin with chicken, low-oil|170|10|20.8|5.2|
ته‌‌چین ساده با مرغ پرروغن|Plain tahchin with chicken, extra-oil|197|10|20.8|8.2|
ته‌‌چین ساده با گوشت گوسفندی|Plain tahchin with lamb|196|9.3|20.3|8.6|
ته‌‌چین ساده با گوشت گوسفندی کم‌روغن|Plain tahchin with lamb, low-oil|185|9.3|20.3|7.4|
ته‌‌چین ساده با گوشت گوسفندی پرروغن|Plain tahchin with lamb, extra-oil|212|9.3|20.3|10.4|
ته‌‌چین ساده با گوشت گاو|Plain tahchin with beef|186|10.3|20.3|7.1|
ته‌‌چین ساده با گوشت گاو کم‌روغن|Plain tahchin with beef, low-oil|176|10.3|20.3|5.9|
ته‌‌چین ساده با گوشت گاو پرروغن|Plain tahchin with beef, extra-oil|203|10.3|20.3|8.9|
ماهی پلو|Mahi polo herb|148|3.5|25|3.8|
ماهی پلو کم‌روغن|Mahi polo herb, low-oil|134|3.5|25|2.2|
ماهی پلو پرروغن|Mahi polo herb, extra-oil|170|3.5|25|6.2|
میگو پلو|Meygoo polo|156|5|26|3.5|میگو‌پلو
میگو پلو کم‌روغن|Meygoo polo, low-oil|141|5|26|1.9|میگو‌پلو
میگو پلو پرروغن|Meygoo polo, extra-oil|177|5|26|5.9|میگو‌پلو
تمر هندی پلو|Tamarind polo|162|3|29|3.8|
تمر هندی پلو کم‌روغن|Tamarind polo, low-oil|148|3|29|2.2|
تمر هندی پلو پرروغن|Tamarind polo, extra-oil|184|3|29|6.2|
تمر هندی پلو با مرغ|Tamarind polo with chicken|169|8.5|22.3|5.1|
تمر هندی پلو با مرغ کم‌روغن|Tamarind polo with chicken, low-oil|158|8.5|22.3|3.9|
تمر هندی پلو با مرغ پرروغن|Tamarind polo with chicken, extra-oil|185|8.5|22.3|6.9|
تمر هندی پلو با گوشت گوسفندی|Tamarind polo with lamb|185|7.8|21.8|7.4|
تمر هندی پلو با گوشت گوسفندی کم‌روغن|Tamarind polo with lamb, low-oil|174|7.8|21.8|6.2|
تمر هندی پلو با گوشت گوسفندی پرروغن|Tamarind polo with lamb, extra-oil|200|7.8|21.8|9.1|
تمر هندی پلو با گوشت گاو|Tamarind polo with beef|176|8.8|21.8|5.9|
تمر هندی پلو با گوشت گاو کم‌روغن|Tamarind polo with beef, low-oil|165|8.8|21.8|4.7|
تمر هندی پلو با گوشت گاو پرروغن|Tamarind polo with beef, extra-oil|192|8.8|21.8|7.7|
تمر هندی پلو با ماهی|Tamarind polo with fish|171|7.8|22.8|5.4|
تمر هندی پلو با ماهی کم‌روغن|Tamarind polo with fish, low-oil|160|7.8|22.8|4.2|
تمر هندی پلو با ماهی پرروغن|Tamarind polo with fish, extra-oil|187|7.8|22.8|7.2|
ریواس پلو|Rivas polo|148|2.8|26|3.6|
ریواس پلو کم‌روغن|Rivas polo, low-oil|133|2.8|26|2|
ریواس پلو پرروغن|Rivas polo, extra-oil|169|2.8|26|6|
ریواس پلو با مرغ|Rivas polo with chicken|159|8.4|20|5|
ریواس پلو با مرغ کم‌روغن|Rivas polo with chicken, low-oil|148|8.4|20|3.8|
ریواس پلو با مرغ پرروغن|Rivas polo with chicken, extra-oil|175|8.4|20|6.8|
ریواس پلو با گوشت گوسفندی|Rivas polo with lamb|173|7.6|19.5|7.2|
ریواس پلو با گوشت گوسفندی کم‌روغن|Rivas polo with lamb, low-oil|162|7.6|19.5|6|
ریواس پلو با گوشت گوسفندی پرروغن|Rivas polo with lamb, extra-oil|189|7.6|19.5|9|
ریواس پلو با گوشت گاو|Rivas polo with beef|164|8.6|19.5|5.7|
ریواس پلو با گوشت گاو کم‌روغن|Rivas polo with beef, low-oil|153|8.6|19.5|4.5|
ریواس پلو با گوشت گاو پرروغن|Rivas polo with beef, extra-oil|180|8.6|19.5|7.5|
ریواس پلو با ماهی|Rivas polo with fish|159|7.6|20.5|5.2|
ریواس پلو با ماهی کم‌روغن|Rivas polo with fish, low-oil|148|7.6|20.5|4|
ریواس پلو با ماهی پرروغن|Rivas polo with fish, extra-oil|175|7.6|20.5|7|
پلو با رشته|Reshteh polo|168|3|31|3.6|رشته پلو
پلو با رشته کم‌روغن|Reshteh polo, low-oil|154|3|31|2|رشته پلو
پلو با رشته پرروغن|Reshteh polo, extra-oil|190|3|31|6|رشته پلو
پلو با رشته با مرغ|Reshteh polo with chicken|174|8.5|23.8|5|رشته پلو
پلو با رشته با مرغ کم‌روغن|Reshteh polo with chicken, low-oil|163|8.5|23.8|3.8|رشته پلو
پلو با رشته با مرغ پرروغن|Reshteh polo with chicken, extra-oil|190|8.5|23.8|6.8|رشته پلو
پلو با رشته با گوشت گوسفندی|Reshteh polo with lamb|189|7.8|23.3|7.2|رشته پلو
پلو با رشته با گوشت گوسفندی کم‌روغن|Reshteh polo with lamb, low-oil|178|7.8|23.3|6|رشته پلو
پلو با رشته با گوشت گوسفندی پرروغن|Reshteh polo with lamb, extra-oil|205|7.8|23.3|9|رشته پلو
پلو با رشته با گوشت گاو|Reshteh polo with beef|180|8.8|23.3|5.7|رشته پلو
پلو با رشته با گوشت گاو کم‌روغن|Reshteh polo with beef, low-oil|169|8.8|23.3|4.5|رشته پلو
پلو با رشته با گوشت گاو پرروغن|Reshteh polo with beef, extra-oil|196|8.8|23.3|7.5|رشته پلو
پلو با رشته با ماهی|Reshteh polo with fish|175|7.8|24.3|5.2|رشته پلو
پلو با رشته با ماهی کم‌روغن|Reshteh polo with fish, low-oil|164|7.8|24.3|4|رشته پلو
پلو با رشته با ماهی پرروغن|Reshteh polo with fish, extra-oil|191|7.8|24.3|7|رشته پلو
پلو با نخود|Polo with chickpeas|151|3.8|26|3.5|
پلو با نخود کم‌روغن|Polo with chickpeas, low-oil|136|3.8|26|1.9|
پلو با نخود پرروغن|Polo with chickpeas, extra-oil|172|3.8|26|5.9|
پلو با نخود با مرغ|Polo with chickpeas with chicken|161|9.1|20|4.9|
پلو با نخود با مرغ کم‌روغن|Polo with chickpeas with chicken, low-oil|150|9.1|20|3.7|
پلو با نخود با مرغ پرروغن|Polo with chickpeas with chicken, extra-oil|177|9.1|20|6.7|
پلو با نخود با گوشت گوسفندی|Polo with chickpeas with lamb|176|8.4|19.5|7.1|
پلو با نخود با گوشت گوسفندی کم‌روغن|Polo with chickpeas with lamb, low-oil|165|8.4|19.5|5.9|
پلو با نخود با گوشت گوسفندی پرروغن|Polo with chickpeas with lamb, extra-oil|192|8.4|19.5|8.9|
پلو با نخود با گوشت گاو|Polo with chickpeas with beef|166|9.4|19.5|5.6|
پلو با نخود با گوشت گاو کم‌روغن|Polo with chickpeas with beef, low-oil|155|9.4|19.5|4.4|
پلو با نخود با گوشت گاو پرروغن|Polo with chickpeas with beef, extra-oil|182|9.4|19.5|7.4|
پلو با نخود با ماهی|Polo with chickpeas with fish|162|8.4|20.5|5.1|
پلو با نخود با ماهی کم‌روغن|Polo with chickpeas with fish, low-oil|151|8.4|20.5|3.9|
پلو با نخود با ماهی پرروغن|Polo with chickpeas with fish, extra-oil|178|8.4|20.5|6.9|
پلو با کشمش و زعفران|Raisin saffron polo|161|2.8|29|3.8|
پلو با کشمش و زعفران کم‌روغن|Raisin saffron polo, low-oil|147|2.8|29|2.2|
پلو با کشمش و زعفران پرروغن|Raisin saffron polo, extra-oil|183|2.8|29|6.2|
پلو با کشمش و زعفران با مرغ|Raisin saffron polo with chicken|169|8.4|22.3|5.1|
پلو با کشمش و زعفران با مرغ کم‌روغن|Raisin saffron polo with chicken, low-oil|158|8.4|22.3|3.9|
پلو با کشمش و زعفران با مرغ پرروغن|Raisin saffron polo with chicken, extra-oil|185|8.4|22.3|6.9|
پلو با کشمش و زعفران با گوشت گوسفندی|Raisin saffron polo with lamb|184|7.6|21.8|7.4|
پلو با کشمش و زعفران با گوشت گوسفندی کم‌روغن|Raisin saffron polo with lamb, low-oil|173|7.6|21.8|6.2|
پلو با کشمش و زعفران با گوشت گوسفندی پرروغن|Raisin saffron polo with lamb, extra-oil|200|7.6|21.8|9.1|
پلو با کشمش و زعفران با گوشت گاو|Raisin saffron polo with beef|175|8.6|21.8|5.9|
پلو با کشمش و زعفران با گوشت گاو کم‌روغن|Raisin saffron polo with beef, low-oil|164|8.6|21.8|4.7|
پلو با کشمش و زعفران با گوشت گاو پرروغن|Raisin saffron polo with beef, extra-oil|191|8.6|21.8|7.7|
پلو با کشمش و زعفران با ماهی|Raisin saffron polo with fish|170|7.6|22.8|5.4|
پلو با کشمش و زعفران با ماهی کم‌روغن|Raisin saffron polo with fish, low-oil|159|7.6|22.8|4.2|
پلو با کشمش و زعفران با ماهی پرروغن|Raisin saffron polo with fish, extra-oil|186|7.6|22.8|7.2|
پلو با ته‌دیگ سیب‌زمینی|Polo with potato tahdig|161|3|27|4.5|
پلو با ته‌دیگ سیب‌زمینی کم‌روغن|Polo with potato tahdig, low-oil|146|3|27|2.9|
پلو با ته‌دیگ سیب‌زمینی پرروغن|Polo with potato tahdig, extra-oil|182|3|27|6.9|
پلو با ته‌دیگ سیب‌زمینی با مرغ|Polo with potato tahdig with chicken|168|8.5|20.8|5.6|
پلو با ته‌دیگ سیب‌زمینی با مرغ کم‌روغن|Polo with potato tahdig with chicken, low-oil|157|8.5|20.8|4.4|
پلو با ته‌دیگ سیب‌زمینی با مرغ پرروغن|Polo with potato tahdig with chicken, extra-oil|184|8.5|20.8|7.4|
پلو با ته‌دیگ سیب‌زمینی با گوشت گوسفندی|Polo with potato tahdig with lamb|184|7.8|20.3|7.9|
پلو با ته‌دیگ سیب‌زمینی با گوشت گوسفندی کم‌روغن|Polo with potato tahdig with lamb, low-oil|173|7.8|20.3|6.7|
پلو با ته‌دیگ سیب‌زمینی با گوشت گوسفندی پرروغن|Polo with potato tahdig with lamb, extra-oil|200|7.8|20.3|9.7|
پلو با ته‌دیگ سیب‌زمینی با گوشت گاو|Polo with potato tahdig with beef|174|8.8|20.3|6.4|
پلو با ته‌دیگ سیب‌زمینی با گوشت گاو کم‌روغن|Polo with potato tahdig with beef, low-oil|163|8.8|20.3|5.2|
پلو با ته‌دیگ سیب‌زمینی با گوشت گاو پرروغن|Polo with potato tahdig with beef, extra-oil|190|8.8|20.3|8.2|
پلو با ته‌دیگ سیب‌زمینی با ماهی|Polo with potato tahdig with fish|170|7.8|21.3|5.9|
پلو با ته‌دیگ سیب‌زمینی با ماهی کم‌روغن|Polo with potato tahdig with fish, low-oil|159|7.8|21.3|4.7|
پلو با ته‌دیگ سیب‌زمینی با ماهی پرروغن|Polo with potato tahdig with fish, extra-oil|186|7.8|21.3|7.7|
پلو با ته‌دیگ نان|Polo with bread tahdig|165|3.2|28|4.5|
پلو با ته‌دیگ نان کم‌روغن|Polo with bread tahdig, low-oil|151|3.2|28|2.9|
پلو با ته‌دیگ نان پرروغن|Polo with bread tahdig, extra-oil|187|3.2|28|6.9|
پلو با ته‌دیگ نان با مرغ|Polo with bread tahdig with chicken|171|8.7|21.5|5.6|
پلو با ته‌دیگ نان با مرغ کم‌روغن|Polo with bread tahdig with chicken, low-oil|160|8.7|21.5|4.4|
پلو با ته‌دیگ نان با مرغ پرروغن|Polo with bread tahdig with chicken, extra-oil|187|8.7|21.5|7.4|
پلو با ته‌دیگ نان با گوشت گوسفندی|Polo with bread tahdig with lamb|187|7.9|21|7.9|
پلو با ته‌دیگ نان با گوشت گوسفندی کم‌روغن|Polo with bread tahdig with lamb, low-oil|176|7.9|21|6.7|
پلو با ته‌دیگ نان با گوشت گوسفندی پرروغن|Polo with bread tahdig with lamb, extra-oil|203|7.9|21|9.7|
پلو با ته‌دیگ نان با گوشت گاو|Polo with bread tahdig with beef|177|8.9|21|6.4|
پلو با ته‌دیگ نان با گوشت گاو کم‌روغن|Polo with bread tahdig with beef, low-oil|166|8.9|21|5.2|
پلو با ته‌دیگ نان با گوشت گاو پرروغن|Polo with bread tahdig with beef, extra-oil|193|8.9|21|8.2|
پلو با ته‌دیگ نان با ماهی|Polo with bread tahdig with fish|173|7.9|22|5.9|
پلو با ته‌دیگ نان با ماهی کم‌روغن|Polo with bread tahdig with fish, low-oil|162|7.9|22|4.7|
پلو با ته‌دیگ نان با ماهی پرروغن|Polo with bread tahdig with fish, extra-oil|189|7.9|22|7.7|
پلو با ته‌دیگ کاهو|Polo with lettuce tahdig|152|3|26|4|
پلو با ته‌دیگ کاهو کم‌روغن|Polo with lettuce tahdig, low-oil|138|3|26|2.4|
پلو با ته‌دیگ کاهو پرروغن|Polo with lettuce tahdig, extra-oil|174|3|26|6.4|
پلو با ته‌دیگ کاهو با مرغ|Polo with lettuce tahdig with chicken|162|8.5|20|5.3|
پلو با ته‌دیگ کاهو با مرغ کم‌روغن|Polo with lettuce tahdig with chicken, low-oil|151|8.5|20|4.1|
پلو با ته‌دیگ کاهو با مرغ پرروغن|Polo with lettuce tahdig with chicken, extra-oil|178|8.5|20|7.1|
پلو با ته‌دیگ کاهو با گوشت گوسفندی|Polo with lettuce tahdig with lamb|177|7.8|19.5|7.5|
پلو با ته‌دیگ کاهو با گوشت گوسفندی کم‌روغن|Polo with lettuce tahdig with lamb, low-oil|166|7.8|19.5|6.3|
پلو با ته‌دیگ کاهو با گوشت گوسفندی پرروغن|Polo with lettuce tahdig with lamb, extra-oil|193|7.8|19.5|9.3|
پلو با ته‌دیگ کاهو با گوشت گاو|Polo with lettuce tahdig with beef|167|8.8|19.5|6|
پلو با ته‌دیگ کاهو با گوشت گاو کم‌روغن|Polo with lettuce tahdig with beef, low-oil|156|8.8|19.5|4.8|
پلو با ته‌دیگ کاهو با گوشت گاو پرروغن|Polo with lettuce tahdig with beef, extra-oil|183|8.8|19.5|7.8|
پلو با ته‌دیگ کاهو با ماهی|Polo with lettuce tahdig with fish|163|7.8|20.5|5.5|
پلو با ته‌دیگ کاهو با ماهی کم‌روغن|Polo with lettuce tahdig with fish, low-oil|152|7.8|20.5|4.3|
پلو با ته‌دیگ کاهو با ماهی پرروغن|Polo with lettuce tahdig with fish, extra-oil|179|7.8|20.5|7.3|
کته ساده|Plain kateh|136|2.5|27|2|کته
کته ساده کم‌روغن|Plain kateh, low-oil|125|2.5|27|0.8|کته
کته ساده پرروغن|Plain kateh, extra-oil|158|2.5|27|4.4|کته
کته ساده با مرغ|Plain kateh with chicken|150|8.1|20.8|3.8|کته
کته ساده با مرغ کم‌روغن|Plain kateh with chicken, low-oil|139|8.1|20.8|2.6|کته
کته ساده با مرغ پرروغن|Plain kateh with chicken, extra-oil|166|8.1|20.8|5.6|کته
کته ساده با گوشت گوسفندی|Plain kateh with lamb|165|7.4|20.3|6|کته
کته ساده با گوشت گوسفندی کم‌روغن|Plain kateh with lamb, low-oil|154|7.4|20.3|4.8|کته
کته ساده با گوشت گوسفندی پرروغن|Plain kateh with lamb, extra-oil|181|7.4|20.3|7.8|کته
کته ساده با گوشت گاو|Plain kateh with beef|155|8.4|20.3|4.5|کته
کته ساده با گوشت گاو کم‌روغن|Plain kateh with beef, low-oil|145|8.4|20.3|3.3|کته
کته ساده با گوشت گاو پرروغن|Plain kateh with beef, extra-oil|172|8.4|20.3|6.3|کته
کته با روغن حیوانی|Kateh with ghee|159|2.5|26|5|
کته با روغن حیوانی کم‌روغن|Kateh with ghee, low-oil|145|2.5|26|3.4|
کته با روغن حیوانی پرروغن|Kateh with ghee, extra-oil|181|2.5|26|7.4|
کته با روغن حیوانی با مرغ|Kateh with ghee with chicken|166|8.1|20|6|
کته با روغن حیوانی با مرغ کم‌روغن|Kateh with ghee with chicken, low-oil|156|8.1|20|4.8|
کته با روغن حیوانی با مرغ پرروغن|Kateh with ghee with chicken, extra-oil|183|8.1|20|7.8|
کته با روغن حیوانی با گوشت گوسفندی|Kateh with ghee with lamb|182|7.4|19.5|8.3|
کته با روغن حیوانی با گوشت گوسفندی کم‌روغن|Kateh with ghee with lamb, low-oil|172|7.4|19.5|7.1|
کته با روغن حیوانی با گوشت گوسفندی پرروغن|Kateh with ghee with lamb, extra-oil|199|7.4|19.5|10.1|
کته با روغن حیوانی با گوشت گاو|Kateh with ghee with beef|173|8.4|19.5|6.8|
کته با روغن حیوانی با گوشت گاو کم‌روغن|Kateh with ghee with beef, low-oil|162|8.4|19.5|5.6|
کته با روغن حیوانی با گوشت گاو پرروغن|Kateh with ghee with beef, extra-oil|189|8.4|19.5|8.6|
کته با کره|Kateh with butter|155|2.5|26|4.5|
کته با کره کم‌روغن|Kateh with butter, low-oil|140|2.5|26|2.9|
کته با کره پرروغن|Kateh with butter, extra-oil|176|2.5|26|6.9|
کته با کره با مرغ|Kateh with butter with chicken|163|8.1|20|5.6|
کته با کره با مرغ کم‌روغن|Kateh with butter with chicken, low-oil|152|8.1|20|4.4|
کته با کره با مرغ پرروغن|Kateh with butter with chicken, extra-oil|179|8.1|20|7.4|
کته با کره با گوشت گوسفندی|Kateh with butter with lamb|179|7.4|19.5|7.9|
کته با کره با گوشت گوسفندی کم‌روغن|Kateh with butter with lamb, low-oil|168|7.4|19.5|6.7|
کته با کره با گوشت گوسفندی پرروغن|Kateh with butter with lamb, extra-oil|195|7.4|19.5|9.7|
کته با کره با گوشت گاو|Kateh with butter with beef|169|8.4|19.5|6.4|
کته با کره با گوشت گاو کم‌روغن|Kateh with butter with beef, low-oil|158|8.4|19.5|5.2|
کته با کره با گوشت گاو پرروغن|Kateh with butter with beef, extra-oil|185|8.4|19.5|8.2|
کته رشته|Reshteh kateh|164|3|30|3.5|
کته رشته کم‌روغن|Reshteh kateh, low-oil|149|3|30|1.9|
کته رشته پرروغن|Reshteh kateh, extra-oil|185|3|30|5.9|
کته رشته با مرغ|Reshteh kateh with chicken|170|8.5|23|4.9|
کته رشته با مرغ کم‌روغن|Reshteh kateh with chicken, low-oil|159|8.5|23|3.7|
کته رشته با مرغ پرروغن|Reshteh kateh with chicken, extra-oil|186|8.5|23|6.7|
کته رشته با گوشت گوسفندی|Reshteh kateh with lamb|185|7.8|22.5|7.1|
کته رشته با گوشت گوسفندی کم‌روغن|Reshteh kateh with lamb, low-oil|174|7.8|22.5|5.9|
کته رشته با گوشت گوسفندی پرروغن|Reshteh kateh with lamb, extra-oil|201|7.8|22.5|8.9|
کته رشته با گوشت گاو|Reshteh kateh with beef|176|8.8|22.5|5.6|
کته رشته با گوشت گاو کم‌روغن|Reshteh kateh with beef, low-oil|165|8.8|22.5|4.4|
کته رشته با گوشت گاو پرروغن|Reshteh kateh with beef, extra-oil|192|8.8|22.5|7.4|
کته نخود|Kateh chickpea|147|4|26|3|
کته نخود کم‌روغن|Kateh chickpea, low-oil|133|4|26|1.4|
کته نخود پرروغن|Kateh chickpea, extra-oil|169|4|26|5.4|
کته نخود با مرغ|Kateh chickpea with chicken|158|9.3|20|4.5|
کته نخود با مرغ کم‌روغن|Kateh chickpea with chicken, low-oil|147|9.3|20|3.3|
کته نخود با مرغ پرروغن|Kateh chickpea with chicken, extra-oil|174|9.3|20|6.3|
کته نخود با گوشت گوسفندی|Kateh chickpea with lamb|173|8.5|19.5|6.8|
کته نخود با گوشت گوسفندی کم‌روغن|Kateh chickpea with lamb, low-oil|162|8.5|19.5|5.6|
کته نخود با گوشت گوسفندی پرروغن|Kateh chickpea with lamb, extra-oil|189|8.5|19.5|8.6|
کته نخود با گوشت گاو|Kateh chickpea with beef|164|9.5|19.5|5.3|
کته نخود با گوشت گاو کم‌روغن|Kateh chickpea with beef, low-oil|153|9.5|19.5|4.1|
کته نخود با گوشت گاو پرروغن|Kateh chickpea with beef, extra-oil|180|9.5|19.5|7.1|
کته لوبیا چیتی|Kateh with pinto beans|147|4|26|3|
کته لوبیا چیتی کم‌روغن|Kateh with pinto beans, low-oil|133|4|26|1.4|
کته لوبیا چیتی پرروغن|Kateh with pinto beans, extra-oil|169|4|26|5.4|
کته لوبیا چیتی با مرغ|Kateh with pinto beans with chicken|158|9.3|20|4.5|
کته لوبیا چیتی با مرغ کم‌روغن|Kateh with pinto beans with chicken, low-oil|147|9.3|20|3.3|
کته لوبیا چیتی با مرغ پرروغن|Kateh with pinto beans with chicken, extra-oil|174|9.3|20|6.3|
کته لوبیا چیتی با گوشت گوسفندی|Kateh with pinto beans with lamb|173|8.5|19.5|6.8|
کته لوبیا چیتی با گوشت گوسفندی کم‌روغن|Kateh with pinto beans with lamb, low-oil|162|8.5|19.5|5.6|
کته لوبیا چیتی با گوشت گوسفندی پرروغن|Kateh with pinto beans with lamb, extra-oil|189|8.5|19.5|8.6|
کته لوبیا چیتی با گوشت گاو|Kateh with pinto beans with beef|164|9.5|19.5|5.3|
کته لوبیا چیتی با گوشت گاو کم‌روغن|Kateh with pinto beans with beef, low-oil|153|9.5|19.5|4.1|
کته لوبیا چیتی با گوشت گاو پرروغن|Kateh with pinto beans with beef, extra-oil|180|9.5|19.5|7.1|
کته عدس|Kateh with lentils|147|4|26|3|
کته عدس کم‌روغن|Kateh with lentils, low-oil|133|4|26|1.4|
کته عدس پرروغن|Kateh with lentils, extra-oil|169|4|26|5.4|
کته عدس با مرغ|Kateh with lentils with chicken|158|9.3|20|4.5|
کته عدس با مرغ کم‌روغن|Kateh with lentils with chicken, low-oil|147|9.3|20|3.3|
کته عدس با مرغ پرروغن|Kateh with lentils with chicken, extra-oil|174|9.3|20|6.3|
کته عدس با گوشت گوسفندی|Kateh with lentils with lamb|173|8.5|19.5|6.8|
کته عدس با گوشت گوسفندی کم‌روغن|Kateh with lentils with lamb, low-oil|162|8.5|19.5|5.6|
کته عدس با گوشت گوسفندی پرروغن|Kateh with lentils with lamb, extra-oil|189|8.5|19.5|8.6|
کته عدس با گوشت گاو|Kateh with lentils with beef|164|9.5|19.5|5.3|
کته عدس با گوشت گاو کم‌روغن|Kateh with lentils with beef, low-oil|153|9.5|19.5|4.1|
کته عدس با گوشت گاو پرروغن|Kateh with lentils with beef, extra-oil|180|9.5|19.5|7.1|
کته ماش|Kateh with mung beans|147|4|26|3|
کته ماش کم‌روغن|Kateh with mung beans, low-oil|133|4|26|1.4|
کته ماش پرروغن|Kateh with mung beans, extra-oil|169|4|26|5.4|
کته ماش با مرغ|Kateh with mung beans with chicken|158|9.3|20|4.5|
کته ماش با مرغ کم‌روغن|Kateh with mung beans with chicken, low-oil|147|9.3|20|3.3|
کته ماش با مرغ پرروغن|Kateh with mung beans with chicken, extra-oil|174|9.3|20|6.3|
کته ماش با گوشت گوسفندی|Kateh with mung beans with lamb|173|8.5|19.5|6.8|
کته ماش با گوشت گوسفندی کم‌روغن|Kateh with mung beans with lamb, low-oil|162|8.5|19.5|5.6|
کته ماش با گوشت گوسفندی پرروغن|Kateh with mung beans with lamb, extra-oil|189|8.5|19.5|8.6|
کته ماش با گوشت گاو|Kateh with mung beans with beef|164|9.5|19.5|5.3|
کته ماش با گوشت گاو کم‌روغن|Kateh with mung beans with beef, low-oil|153|9.5|19.5|4.1|
کته ماش با گوشت گاو پرروغن|Kateh with mung beans with beef, extra-oil|180|9.5|19.5|7.1|
کته سبزی|Kateh with herbs|139|3|25|3|
کته سبزی کم‌روغن|Kateh with herbs, low-oil|125|3|25|1.4|
کته سبزی پرروغن|Kateh with herbs, extra-oil|161|3|25|5.4|
کته سبزی با مرغ|Kateh with herbs with chicken|152|8.5|19.3|4.5|
کته سبزی با مرغ کم‌روغن|Kateh with herbs with chicken, low-oil|141|8.5|19.3|3.3|
کته سبزی با مرغ پرروغن|Kateh with herbs with chicken, extra-oil|168|8.5|19.3|6.3|
کته سبزی با گوشت گوسفندی|Kateh with herbs with lamb|168|7.8|18.8|6.8|
کته سبزی با گوشت گوسفندی کم‌روغن|Kateh with herbs with lamb, low-oil|157|7.8|18.8|5.6|
کته سبزی با گوشت گوسفندی پرروغن|Kateh with herbs with lamb, extra-oil|184|7.8|18.8|8.6|
کته سبزی با گوشت گاو|Kateh with herbs with beef|158|8.8|18.8|5.3|
کته سبزی با گوشت گاو کم‌روغن|Kateh with herbs with beef, low-oil|147|8.8|18.8|4.1|
کته سبزی با گوشت گاو پرروغن|Kateh with herbs with beef, extra-oil|174|8.8|18.8|7.1|
کته باقالی|Kateh with fava|142|3.8|25|3|
کته باقالی کم‌روغن|Kateh with fava, low-oil|128|3.8|25|1.4|
کته باقالی پرروغن|Kateh with fava, extra-oil|164|3.8|25|5.4|
کته باقالی با مرغ|Kateh with fava with chicken|154|9.1|19.3|4.5|
کته باقالی با مرغ کم‌روغن|Kateh with fava with chicken, low-oil|143|9.1|19.3|3.3|
کته باقالی با مرغ پرروغن|Kateh with fava with chicken, extra-oil|170|9.1|19.3|6.3|
کته باقالی با گوشت گوسفندی|Kateh with fava with lamb|170|8.4|18.8|6.8|
کته باقالی با گوشت گوسفندی کم‌روغن|Kateh with fava with lamb, low-oil|159|8.4|18.8|5.6|
کته باقالی با گوشت گوسفندی پرروغن|Kateh with fava with lamb, extra-oil|186|8.4|18.8|8.6|
کته باقالی با گوشت گاو|Kateh with fava with beef|161|9.4|18.8|5.3|
کته باقالی با گوشت گاو کم‌روغن|Kateh with fava with beef, low-oil|150|9.4|18.8|4.1|
کته باقالی با گوشت گاو پرروغن|Kateh with fava with beef, extra-oil|177|9.4|18.8|7.1|
کته زرشک|Kateh with barberry|145|2.6|27|3|
کته زرشک کم‌روغن|Kateh with barberry, low-oil|131|2.6|27|1.4|
کته زرشک پرروغن|Kateh with barberry, extra-oil|167|2.6|27|5.4|
کته زرشک با مرغ|Kateh with barberry with chicken|157|8.2|20.8|4.5|
کته زرشک با مرغ کم‌روغن|Kateh with barberry with chicken, low-oil|146|8.2|20.8|3.3|
کته زرشک با مرغ پرروغن|Kateh with barberry with chicken, extra-oil|173|8.2|20.8|6.3|
کته زرشک با گوشت گوسفندی|Kateh with barberry with lamb|172|7.5|20.3|6.8|
کته زرشک با گوشت گوسفندی کم‌روغن|Kateh with barberry with lamb, low-oil|162|7.5|20.3|5.6|
کته زرشک با گوشت گوسفندی پرروغن|Kateh with barberry with lamb, extra-oil|189|7.5|20.3|8.6|
کته زرشک با گوشت گاو|Kateh with barberry with beef|163|8.5|20.3|5.3|
کته زرشک با گوشت گاو کم‌روغن|Kateh with barberry with beef, low-oil|152|8.5|20.3|4.1|
کته زرشک با گوشت گاو پرروغن|Kateh with barberry with beef, extra-oil|179|8.5|20.3|7.1|
کته زعفرانی|Saffron kateh|145|2.5|27|3|
کته زعفرانی کم‌روغن|Saffron kateh, low-oil|131|2.5|27|1.4|
کته زعفرانی پرروغن|Saffron kateh, extra-oil|167|2.5|27|5.4|
کته زعفرانی با مرغ|Saffron kateh with chicken|156|8.1|20.8|4.5|
کته زعفرانی با مرغ کم‌روغن|Saffron kateh with chicken, low-oil|145|8.1|20.8|3.3|
کته زعفرانی با مرغ پرروغن|Saffron kateh with chicken, extra-oil|172|8.1|20.8|6.3|
کته زعفرانی با گوشت گوسفندی|Saffron kateh with lamb|172|7.4|20.3|6.8|
کته زعفرانی با گوشت گوسفندی کم‌روغن|Saffron kateh with lamb, low-oil|161|7.4|20.3|5.6|
کته زعفرانی با گوشت گوسفندی پرروغن|Saffron kateh with lamb, extra-oil|188|7.4|20.3|8.6|
کته زعفرانی با گوشت گاو|Saffron kateh with beef|163|8.4|20.3|5.3|
کته زعفرانی با گوشت گاو کم‌روغن|Saffron kateh with beef, low-oil|152|8.4|20.3|4.1|
کته زعفرانی با گوشت گاو پرروغن|Saffron kateh with beef, extra-oil|179|8.4|20.3|7.1|
کته با ماست|Kateh with yogurt|140|3|24|3.5|
کته با ماست کم‌روغن|Kateh with yogurt, low-oil|125|3|24|1.9|
کته با ماست پرروغن|Kateh with yogurt, extra-oil|161|3|24|5.9|
کته با ماست با مرغ|Kateh with yogurt with chicken|152|8.5|18.5|4.9|
کته با ماست با مرغ کم‌روغن|Kateh with yogurt with chicken, low-oil|141|8.5|18.5|3.7|
کته با ماست با مرغ پرروغن|Kateh with yogurt with chicken, extra-oil|168|8.5|18.5|6.7|
کته با ماست با گوشت گوسفندی|Kateh with yogurt with lamb|167|7.8|18|7.1|
کته با ماست با گوشت گوسفندی کم‌روغن|Kateh with yogurt with lamb, low-oil|156|7.8|18|5.9|
کته با ماست با گوشت گوسفندی پرروغن|Kateh with yogurt with lamb, extra-oil|183|7.8|18|8.9|
کته با ماست با گوشت گاو|Kateh with yogurt with beef|158|8.8|18|5.6|
کته با ماست با گوشت گاو کم‌روغن|Kateh with yogurt with beef, low-oil|147|8.8|18|4.4|
کته با ماست با گوشت گاو پرروغن|Kateh with yogurt with beef, extra-oil|174|8.8|18|7.4|
چلو ساده کم‌روغن|Plain chelo, low-oil|126|2.5|27|0.9|چلو
چلو ساده پرروغن|Plain chelo, extra-oil|162|2.5|27|4.9|چلو
چلو ساده با مرغ|Plain chelo with chicken|153|8.1|20.8|4.1|چلو
چلو ساده با مرغ کم‌روغن|Plain chelo with chicken, low-oil|142|8.1|20.8|2.9|چلو
چلو ساده با مرغ پرروغن|Plain chelo with chicken, extra-oil|169|8.1|20.8|5.9|چلو
چلو ساده با گوشت گوسفندی|Plain chelo with lamb|168|7.4|20.3|6.4|چلو
چلو ساده با گوشت گوسفندی کم‌روغن|Plain chelo with lamb, low-oil|158|7.4|20.3|5.2|چلو
چلو ساده با گوشت گوسفندی پرروغن|Plain chelo with lamb, extra-oil|185|7.4|20.3|8.2|چلو
چلو ساده با گوشت گاو|Plain chelo with beef|159|8.4|20.3|4.9|چلو
چلو ساده با گوشت گاو کم‌روغن|Plain chelo with beef, low-oil|148|8.4|20.3|3.7|چلو
چلو ساده با گوشت گاو پرروغن|Plain chelo with beef, extra-oil|175|8.4|20.3|6.7|چلو
چلو زعفرانی|Saffron chelo|145|2.5|27|3|
چلو زعفرانی کم‌روغن|Saffron chelo, low-oil|131|2.5|27|1.4|
چلو زعفرانی پرروغن|Saffron chelo, extra-oil|167|2.5|27|5.4|
چلو زعفرانی با مرغ|Saffron chelo with chicken|156|8.1|20.8|4.5|
چلو زعفرانی با مرغ کم‌روغن|Saffron chelo with chicken, low-oil|145|8.1|20.8|3.3|
چلو زعفرانی با مرغ پرروغن|Saffron chelo with chicken, extra-oil|172|8.1|20.8|6.3|
چلو زعفرانی با گوشت گوسفندی|Saffron chelo with lamb|172|7.4|20.3|6.8|
چلو زعفرانی با گوشت گوسفندی کم‌روغن|Saffron chelo with lamb, low-oil|161|7.4|20.3|5.6|
چلو زعفرانی با گوشت گوسفندی پرروغن|Saffron chelo with lamb, extra-oil|188|7.4|20.3|8.6|
چلو زعفرانی با گوشت گاو|Saffron chelo with beef|163|8.4|20.3|5.3|
چلو زعفرانی با گوشت گاو کم‌روغن|Saffron chelo with beef, low-oil|152|8.4|20.3|4.1|
چلو زعفرانی با گوشت گاو پرروغن|Saffron chelo with beef, extra-oil|179|8.4|20.3|7.1|
چلو با ته‌دیگ|Chelo with tahdig|164|2.8|28|4.5|
چلو با ته‌دیگ کم‌روغن|Chelo with tahdig, low-oil|149|2.8|28|2.9|
چلو با ته‌دیگ پرروغن|Chelo with tahdig, extra-oil|185|2.8|28|6.9|
چلو با ته‌دیگ با مرغ|Chelo with tahdig with chicken|170|8.4|21.5|5.6|
چلو با ته‌دیگ با مرغ کم‌روغن|Chelo with tahdig with chicken, low-oil|159|8.4|21.5|4.4|
چلو با ته‌دیگ با مرغ پرروغن|Chelo with tahdig with chicken, extra-oil|186|8.4|21.5|7.4|
چلو با ته‌دیگ با گوشت گوسفندی|Chelo with tahdig with lamb|186|7.6|21|7.9|
چلو با ته‌دیگ با گوشت گوسفندی کم‌روغن|Chelo with tahdig with lamb, low-oil|175|7.6|21|6.7|
چلو با ته‌دیگ با گوشت گوسفندی پرروغن|Chelo with tahdig with lamb, extra-oil|202|7.6|21|9.7|
چلو با ته‌دیگ با گوشت گاو|Chelo with tahdig with beef|176|8.6|21|6.4|
چلو با ته‌دیگ با گوشت گاو کم‌روغن|Chelo with tahdig with beef, low-oil|165|8.6|21|5.2|
چلو با ته‌دیگ با گوشت گاو پرروغن|Chelo with tahdig with beef, extra-oil|192|8.6|21|8.2|
پلو گیلانی|Gilaki polo|148|3|26|3.5|
پلو گیلانی کم‌روغن|Gilaki polo, low-oil|133|3|26|1.9|
پلو گیلانی پرروغن|Gilaki polo, extra-oil|169|3|26|5.9|
پلو گیلانی با مرغ|Gilaki polo with chicken|158|8.5|20|4.9|
پلو گیلانی با مرغ کم‌روغن|Gilaki polo with chicken, low-oil|147|8.5|20|3.7|
پلو گیلانی با مرغ پرروغن|Gilaki polo with chicken, extra-oil|174|8.5|20|6.7|
پلو گیلانی با گوشت گوسفندی|Gilaki polo with lamb|173|7.8|19.5|7.1|
پلو گیلانی با گوشت گوسفندی کم‌روغن|Gilaki polo with lamb, low-oil|162|7.8|19.5|5.9|
پلو گیلانی با گوشت گوسفندی پرروغن|Gilaki polo with lamb, extra-oil|189|7.8|19.5|8.9|
پلو گیلانی با گوشت گاو|Gilaki polo with beef|164|8.8|19.5|5.6|
پلو گیلانی با گوشت گاو کم‌روغن|Gilaki polo with beef, low-oil|153|8.8|19.5|4.4|
پلو گیلانی با گوشت گاو پرروغن|Gilaki polo with beef, extra-oil|180|8.8|19.5|7.4|
پلو گیلانی با ماهی|Gilaki polo with fish|159|7.8|20.5|5.1|
پلو گیلانی با ماهی کم‌روغن|Gilaki polo with fish, low-oil|148|7.8|20.5|3.9|
پلو گیلانی با ماهی پرروغن|Gilaki polo with fish, extra-oil|175|7.8|20.5|6.9|
پلو دمی|Dami polo|142|2.6|28|2.2|دمی
پلو دمی کم‌روغن|Dami polo, low-oil|130|2.6|28|0.8|دمی
پلو دمی پرروغن|Dami polo, extra-oil|164|2.6|28|4.6|دمی
پلو دمی با مرغ|Dami polo with chicken|154|8.2|21.5|3.9|دمی
پلو دمی با مرغ کم‌روغن|Dami polo with chicken, low-oil|143|8.2|21.5|2.7|دمی
پلو دمی با مرغ پرروغن|Dami polo with chicken, extra-oil|170|8.2|21.5|5.7|دمی
پلو دمی با گوشت گوسفندی|Dami polo with lamb|170|7.5|21|6.2|دمی
پلو دمی با گوشت گوسفندی کم‌روغن|Dami polo with lamb, low-oil|159|7.5|21|5|دمی
پلو دمی با گوشت گوسفندی پرروغن|Dami polo with lamb, extra-oil|186|7.5|21|8|دمی
پلو دمی با گوشت گاو|Dami polo with beef|160|8.5|21|4.7|دمی
پلو دمی با گوشت گاو کم‌روغن|Dami polo with beef, low-oil|150|8.5|21|3.5|دمی
پلو دمی با گوشت گاو پرروغن|Dami polo with beef, extra-oil|177|8.5|21|6.5|دمی
پلو با پلوپز|Rice cooker polo|141|2.6|27|2.5|
پلو با پلوپز کم‌روغن|Rice cooker polo, low-oil|127|2.6|27|0.9|
پلو با پلوپز پرروغن|Rice cooker polo, extra-oil|163|2.6|27|4.9|
پلو با پلوپز با مرغ|Rice cooker polo with chicken|153|8.2|20.8|4.1|
پلو با پلوپز با مرغ کم‌روغن|Rice cooker polo with chicken, low-oil|142|8.2|20.8|2.9|
پلو با پلوپز با مرغ پرروغن|Rice cooker polo with chicken, extra-oil|169|8.2|20.8|5.9|
پلو با پلوپز با گوشت گوسفندی|Rice cooker polo with lamb|169|7.5|20.3|6.4|
پلو با پلوپز با گوشت گوسفندی کم‌روغن|Rice cooker polo with lamb, low-oil|158|7.5|20.3|5.2|
پلو با پلوپز با گوشت گوسفندی پرروغن|Rice cooker polo with lamb, extra-oil|185|7.5|20.3|8.2|
پلو با پلوپز با گوشت گاو|Rice cooker polo with beef|159|8.5|20.3|4.9|
پلو با پلوپز با گوشت گاو کم‌روغن|Rice cooker polo with beef, low-oil|149|8.5|20.3|3.7|
پلو با پلوپز با گوشت گاو پرروغن|Rice cooker polo with beef, extra-oil|176|8.5|20.3|6.7|
برنج دم‌کشیده|Steamed rice|136|2.5|28|1.5|
برنج دم‌کشیده کم‌روغن|Steamed rice, low-oil|129|2.5|28|0.8|
برنج دم‌کشیده پرروغن|Steamed rice, extra-oil|157|2.5|28|3.9|
برنج دم‌کشیده با مرغ|Steamed rice with chicken|149|8.1|21.5|3.4|
برنج دم‌کشیده با مرغ کم‌روغن|Steamed rice with chicken, low-oil|138|8.1|21.5|2.2|
برنج دم‌کشیده با مرغ پرروغن|Steamed rice with chicken, extra-oil|165|8.1|21.5|5.2|
برنج دم‌کشیده با گوشت گوسفندی|Steamed rice with lamb|164|7.4|21|5.6|
برنج دم‌کشیده با گوشت گوسفندی کم‌روغن|Steamed rice with lamb, low-oil|153|7.4|21|4.4|
برنج دم‌کشیده با گوشت گوسفندی پرروغن|Steamed rice with lamb, extra-oil|180|7.4|21|7.4|
برنج دم‌کشیده با گوشت گاو|Steamed rice with beef|155|8.4|21|4.1|
برنج دم‌کشیده با گوشت گاو کم‌روغن|Steamed rice with beef, low-oil|144|8.4|21|2.9|
برنج دم‌کشیده با گوشت گاو پرروغن|Steamed rice with beef, extra-oil|171|8.4|21|5.9|
برنج کم‌روغن|Low-fat rice|131|2.5|28|1|
برنج کم‌روغن کم‌روغن|Low-fat rice, low-oil|129|2.5|28|0.8|
برنج کم‌روغن پرروغن|Low-fat rice, extra-oil|153|2.5|28|3.4|
برنج کم‌روغن با مرغ|Low-fat rice with chicken|145|8.1|21.5|3|
برنج کم‌روغن با مرغ کم‌روغن|Low-fat rice with chicken, low-oil|135|8.1|21.5|1.8|
برنج کم‌روغن با مرغ پرروغن|Low-fat rice with chicken, extra-oil|162|8.1|21.5|4.8|
برنج کم‌روغن با گوشت گوسفندی|Low-fat rice with lamb|161|7.4|21|5.3|
برنج کم‌روغن با گوشت گوسفندی کم‌روغن|Low-fat rice with lamb, low-oil|151|7.4|21|4.1|
برنج کم‌روغن با گوشت گوسفندی پرروغن|Low-fat rice with lamb, extra-oil|178|7.4|21|7.1|
برنج کم‌روغن با گوشت گاو|Low-fat rice with beef|152|8.4|21|3.8|
برنج کم‌روغن با گوشت گاو کم‌روغن|Low-fat rice with beef, low-oil|141|8.4|21|2.6|
برنج کم‌روغن با گوشت گاو پرروغن|Low-fat rice with beef, extra-oil|168|8.4|21|5.6|
برنج با کره|Buttered rice|154|2.5|27|4|
برنج با کره کم‌روغن|Buttered rice, low-oil|140|2.5|27|2.4|
برنج با کره پرروغن|Buttered rice, extra-oil|176|2.5|27|6.4|
برنج با کره با مرغ|Buttered rice with chicken|163|8.1|20.8|5.3|
برنج با کره با مرغ کم‌روغن|Buttered rice with chicken, low-oil|153|8.1|20.8|4.1|
برنج با کره با مرغ پرروغن|Buttered rice with chicken, extra-oil|180|8.1|20.8|7.1|
برنج با کره با گوشت گوسفندی|Buttered rice with lamb|178|7.4|20.3|7.5|
برنج با کره با گوشت گوسفندی کم‌روغن|Buttered rice with lamb, low-oil|168|7.4|20.3|6.3|
برنج با کره با گوشت گوسفندی پرروغن|Buttered rice with lamb, extra-oil|195|7.4|20.3|9.3|
برنج با کره با گوشت گاو|Buttered rice with beef|169|8.4|20.3|6|
برنج با کره با گوشت گاو کم‌روغن|Buttered rice with beef, low-oil|158|8.4|20.3|4.8|
برنج با کره با گوشت گاو پرروغن|Buttered rice with beef, extra-oil|185|8.4|20.3|7.8|
برنج قهوه‌ای|Brown rice polo|132|2.9|26|1.8|برنج قهوه ای
برنج قهوه‌ای کم‌روغن|Brown rice polo, low-oil|123|2.9|26|0.8|برنج قهوه ای
برنج قهوه‌ای پرروغن|Brown rice polo, extra-oil|153|2.9|26|4.2|برنج قهوه ای
برنج قهوه‌ای با مرغ|Brown rice polo with chicken|146|8.4|20|3.6|برنج قهوه ای
برنج قهوه‌ای با مرغ کم‌روغن|Brown rice polo with chicken, low-oil|135|8.4|20|2.4|برنج قهوه ای
برنج قهوه‌ای با مرغ پرروغن|Brown rice polo with chicken, extra-oil|162|8.4|20|5.4|برنج قهوه ای
برنج قهوه‌ای با گوشت گوسفندی|Brown rice polo with lamb|162|7.7|19.5|5.9|برنج قهوه ای
برنج قهوه‌ای با گوشت گوسفندی کم‌روغن|Brown rice polo with lamb, low-oil|151|7.7|19.5|4.7|برنج قهوه ای
برنج قهوه‌ای با گوشت گوسفندی پرروغن|Brown rice polo with lamb, extra-oil|178|7.7|19.5|7.7|برنج قهوه ای
برنج قهوه‌ای با گوشت گاو|Brown rice polo with beef|152|8.7|19.5|4.4|برنج قهوه ای
برنج قهوه‌ای با گوشت گاو کم‌روغن|Brown rice polo with beef, low-oil|142|8.7|19.5|3.2|برنج قهوه ای
برنج قهوه‌ای با گوشت گاو پرروغن|Brown rice polo with beef, extra-oil|169|8.7|19.5|6.2|برنج قهوه ای
برنج دودی شمالی|Smoked northern rice|145|2.7|28|2.5|
برنج دودی شمالی کم‌روغن|Smoked northern rice, low-oil|131|2.7|28|0.9|
برنج دودی شمالی پرروغن|Smoked northern rice, extra-oil|167|2.7|28|4.9|
برنج دودی شمالی با مرغ|Smoked northern rice with chicken|156|8.3|21.5|4.1|
برنج دودی شمالی با مرغ کم‌روغن|Smoked northern rice with chicken, low-oil|145|8.3|21.5|2.9|
برنج دودی شمالی با مرغ پرروغن|Smoked northern rice with chicken, extra-oil|172|8.3|21.5|5.9|
برنج دودی شمالی با گوشت گوسفندی|Smoked northern rice with lamb|172|7.5|21|6.4|
برنج دودی شمالی با گوشت گوسفندی کم‌روغن|Smoked northern rice with lamb, low-oil|161|7.5|21|5.2|
برنج دودی شمالی با گوشت گوسفندی پرروغن|Smoked northern rice with lamb, extra-oil|188|7.5|21|8.2|
برنج دودی شمالی با گوشت گاو|Smoked northern rice with beef|162|8.5|21|4.9|
برنج دودی شمالی با گوشت گاو کم‌روغن|Smoked northern rice with beef, low-oil|151|8.5|21|3.7|
برنج دودی شمالی با گوشت گاو پرروغن|Smoked northern rice with beef, extra-oil|178|8.5|21|6.7|
آش رشته کم‌روغن|Ash reshteh, low-oil|61|3.3|10|0.9|آش رشته ایرانی
آش رشته پرروغن رستورانی|Ash reshteh, rich restaurant-style|96|3.6|10|4.6|آش رشته ایرانی
آش رشته با کشک|Ash reshteh with kashk|83|4|10|3|
آش رشته با کشک کم‌روغن|Ash reshteh with kashk, low-oil|68|3.7|10|1.5|
آش رشته با کشک پرروغن رستورانی|Ash reshteh with kashk, rich restaurant-style|103|4|10|5.2|
آش جو کم‌روغن|Ash jo barley, low-oil|55|2.7|10|0.5|
آش جو پرروغن رستورانی|Ash jo barley, rich restaurant-style|90|3|10|4.2|
آش جو با گوشت|Barley ash with meat|80|4.2|10|2.6|
آش جو با گوشت کم‌روغن|Barley ash with meat, low-oil|66|3.9|10|1.1|
آش جو با گوشت پرروغن رستورانی|Barley ash with meat, rich restaurant-style|100|4.2|10|4.8|
آش دوغ کم‌روغن|Ash doogh, low-oil|50|2.2|8|1|
آش دوغ پرروغن رستورانی|Ash doogh, rich restaurant-style|84|2.5|8|4.7|
آش دوغ اردبیلی|Ardabil doogh ash|65|2.8|8|2.4|
آش دوغ اردبیلی کم‌روغن|Ardabil doogh ash, low-oil|50|2.5|8|0.9|
آش دوغ اردبیلی پرروغن رستورانی|Ardabil doogh ash, rich restaurant-style|85|2.8|8|4.6|
آش ماست کم‌روغن|Ash mast, low-oil|60|2.7|9|1.5|
آش ماست پرروغن رستورانی|Ash mast, rich restaurant-style|95|3|9|5.2|
آش سبزی کم‌روغن|Ash sabzi, low-oil|52|2.7|8|1|
آش سبزی پرروغن رستورانی|Ash sabzi, rich restaurant-style|86|3|8|4.7|
آش شله‌قلمکار کم‌روغن|Ash sholeh ghalamkar, low-oil|75|3.7|12|1.3|آش شله قلمکار
آش شله‌قلمکار پرروغن رستورانی|Ash sholeh ghalamkar, rich restaurant-style|109|4|12|5|آش شله قلمکار
آش سمنو‌سبزی|Ash with herbs sumac|65|2.8|8|2.4|
آش سمنو‌سبزی کم‌روغن|Ash with herbs sumac, low-oil|50|2.5|8|0.9|
آش سمنو‌سبزی پرروغن رستورانی|Ash with herbs sumac, rich restaurant-style|85|2.8|8|4.6|
آش کدو کم‌روغن|Ash kadoo, low-oil|43|1.7|8|0.5|
آش کدو پرروغن رستورانی|Ash kadoo, rich restaurant-style|78|2|8|4.2|
آش انار کم‌روغن|Ash anar, low-oil|67|2.5|12|1|
آش انار پرروغن رستورانی|Ash anar, rich restaurant-style|102|2.8|12|4.7|
آش آلو|Ash aloo|79|2.4|12|2.4|
آش آلو کم‌روغن|Ash aloo, low-oil|65|2.1|12|0.9|
آش آلو پرروغن رستورانی|Ash aloo, rich restaurant-style|99|2.4|12|4.6|
آش مرغ|Chicken ash|72|4.5|8|2.4|
آش مرغ کم‌روغن|Chicken ash, low-oil|57|4.2|8|0.9|
آش مرغ پرروغن رستورانی|Chicken ash, rich restaurant-style|91|4.5|8|4.6|
آش بلغور کم‌روغن|Ash bulgur, low-oil|62|2.9|11|0.7|
آش بلغور پرروغن رستورانی|Ash bulgur, rich restaurant-style|96|3.2|11|4.4|
آش ترخینه کم‌روغن|Ash tarkhineh, low-oil|70|3.1|12|1.1|
آش ترخینه پرروغن رستورانی|Ash tarkhineh, rich restaurant-style|105|3.4|12|4.8|
آش کشک کم‌روغن|Ash kashk, low-oil|63|3.3|9|1.5|آش کشک و بادمجان
آش کشک پرروغن رستورانی|Ash kashk, rich restaurant-style|97|3.6|9|5.2|آش کشک و بادمجان
آش کشک بادمجان|Ash kashk bademjan|71|3|8|3|
آش کشک بادمجان کم‌روغن|Ash kashk bademjan, low-oil|56|2.7|8|1.5|
آش کشک بادمجان پرروغن رستورانی|Ash kashk bademjan, rich restaurant-style|91|3|8|5.2|
آش دوغ با نخود و لوبیا|Doogh ash with beans|75|3.6|10|2.3|
آش دوغ با نخود و لوبیا کم‌روغن|Doogh ash with beans, low-oil|60|3.3|10|0.8|
آش دوغ با نخود و لوبیا پرروغن رستورانی|Doogh ash with beans, rich restaurant-style|95|3.6|10|4.5|
آش قلیه ماهی|Ash ghalieh mahi|67|4|6|3|
آش قلیه ماهی کم‌روغن|Ash ghalieh mahi, low-oil|52|3.7|6|1.5|
آش قلیه ماهی پرروغن رستورانی|Ash ghalieh mahi, rich restaurant-style|87|4|6|5.2|
آش مولخیه|Ash molokhia|63|3.5|6|2.8|
آش مولخیه کم‌روغن|Ash molokhia, low-oil|49|3.2|6|1.3|
آش مولخیه پرروغن رستورانی|Ash molokhia, rich restaurant-style|83|3.5|6|5|
آش ماش|Ash mash|80|4|11|2.2|
آش ماش کم‌روغن|Ash mash, low-oil|65|3.7|11|0.7|
آش ماش پرروغن رستورانی|Ash mash, rich restaurant-style|100|4|11|4.4|
آش لپه|Ash lapeh|84|4|12|2.2|
آش لپه کم‌روغن|Ash lapeh, low-oil|69|3.7|12|0.7|
آش لپه پرروغن رستورانی|Ash lapeh, rich restaurant-style|104|4|12|4.4|
آش عدس کم‌روغن|Ash adas, low-oil|69|4.2|12|0.5|
آش عدس پرروغن رستورانی|Ash adas, rich restaurant-style|104|4.5|12|4.2|
آش لوبیا چیتی|Ash pinto bean|83|4.2|12|2|
آش لوبیا چیتی کم‌روغن|Ash pinto bean, low-oil|68|3.9|12|0.5|
آش لوبیا چیتی پرروغن رستورانی|Ash pinto bean, rich restaurant-style|103|4.2|12|4.2|
آش لوبیا قرمز|Ash red bean|83|4.2|12|2|
آش لوبیا قرمز کم‌روغن|Ash red bean, low-oil|68|3.9|12|0.5|
آش لوبیا قرمز پرروغن رستورانی|Ash red bean, rich restaurant-style|103|4.2|12|4.2|
آش نخود و لوبیا|Ash chickpea bean|83|4.2|12|2|
آش نخود و لوبیا کم‌روغن|Ash chickpea bean, low-oil|68|3.9|12|0.5|
آش نخود و لوبیا پرروغن رستورانی|Ash chickpea bean, rich restaurant-style|103|4.2|12|4.2|
آش شلغم|Ash shalgham turnip|58|2|8|2|
آش شلغم کم‌روغن|Ash shalgham turnip, low-oil|43|1.7|8|0.5|
آش شلغم پرروغن رستورانی|Ash shalgham turnip, rich restaurant-style|78|2|8|4.2|
آش یخنی|Ash yakhni|71|3.5|8|2.8|
آش یخنی کم‌روغن|Ash yakhni, low-oil|57|3.2|8|1.3|
آش یخنی پرروغن رستورانی|Ash yakhni, rich restaurant-style|91|3.5|8|5|
آش گندم کم‌روغن|Ash wheat, low-oil|59|2.7|11|0.5|
آش گندم پرروغن رستورانی|Ash wheat, rich restaurant-style|94|3|11|4.2|
آش اسفناج|Ash spinach|65|2.8|8|2.4|
آش اسفناج کم‌روغن|Ash spinach, low-oil|50|2.5|8|0.9|
آش اسفناج پرروغن رستورانی|Ash spinach, rich restaurant-style|85|2.8|8|4.6|
آش بادمجان|Ash bademjan|60|2.4|7|2.5|
آش بادمجان کم‌روغن|Ash bademjan, low-oil|45|2.1|7|1|
آش بادمجان پرروغن رستورانی|Ash bademjan, rich restaurant-style|80|2.4|7|4.7|
آش جو سفید|Ash jo sefid|70|3|10|2|
آش جو سفید کم‌روغن|Ash jo sefid, low-oil|55|2.7|10|0.5|
آش جو سفید پرروغن رستورانی|Ash jo sefid, rich restaurant-style|90|3|10|4.2|
آش آبغوره|Ash abghooreh|66|3|8|2.4|
آش آبغوره کم‌روغن|Ash abghooreh, low-oil|51|2.7|8|0.9|
آش آبغوره پرروغن رستورانی|Ash abghooreh, rich restaurant-style|85|3|8|4.6|
آش کلم|Ash kalam|60|2.4|8|2|
آش کلم کم‌روغن|Ash kalam, low-oil|45|2.1|8|0.5|
آش کلم پرروغن رستورانی|Ash kalam, rich restaurant-style|79|2.4|8|4.2|
آش دوغ شیرازی|Shirazi doogh ash|64|2.6|8|2.4|
آش دوغ شیرازی کم‌روغن|Shirazi doogh ash, low-oil|49|2.3|8|0.9|
آش دوغ شیرازی پرروغن رستورانی|Shirazi doogh ash, rich restaurant-style|84|2.6|8|4.6|
آش گوجه‌فرنگی|Tomato ash|61|2.2|8|2.2|آش گوجه
آش گوجه‌فرنگی کم‌روغن|Tomato ash, low-oil|46|1.9|8|0.7|آش گوجه
آش گوجه‌فرنگی پرروغن رستورانی|Tomato ash, rich restaurant-style|80|2.2|8|4.4|آش گوجه
آش رشته کرمانشاهی|Kermanshah ash reshteh|79|3.8|10|2.6|
آش رشته کرمانشاهی کم‌روغن|Kermanshah ash reshteh, low-oil|64|3.5|10|1.1|
آش رشته کرمانشاهی پرروغن رستورانی|Kermanshah ash reshteh, rich restaurant-style|98|3.8|10|4.8|
آش سبزی ترش|Sour herb ash|65|2.8|8|2.4|
آش سبزی ترش کم‌روغن|Sour herb ash, low-oil|50|2.5|8|0.9|
آش سبزی ترش پرروغن رستورانی|Sour herb ash, rich restaurant-style|85|2.8|8|4.6|
آش ریواس|Rivas ash|61|2.4|8|2.2|
آش ریواس کم‌روغن|Rivas ash, low-oil|47|2.1|8|0.7|
آش ریواس پرروغن رستورانی|Rivas ash, rich restaurant-style|81|2.4|8|4.4|
آش قره‌‌قورمه|Qareh ghorme ash|70|3.8|6|3.4|
آش قره‌‌قورمه کم‌روغن|Qareh ghorme ash, low-oil|55|3.5|6|1.9|
آش قره‌‌قورمه پرروغن رستورانی|Qareh ghorme ash, rich restaurant-style|90|3.8|6|5.6|
آش بلغور گوشت|Bulgur meat ash|86|4|12|2.4|
آش بلغور گوشت کم‌روغن|Bulgur meat ash, low-oil|71|3.7|12|0.9|
آش بلغور گوشت پرروغن رستورانی|Bulgur meat ash, rich restaurant-style|105|4|12|4.6|
آش آلو و اسفناج|Plum spinach ash|77|2.8|11|2.4|
آش آلو و اسفناج کم‌روغن|Plum spinach ash, low-oil|62|2.5|11|0.9|
آش آلو و اسفناج پرروغن رستورانی|Plum spinach ash, rich restaurant-style|97|2.8|11|4.6|
آش گردو|Walnut ash|89|3|8|5|
آش گردو کم‌روغن|Walnut ash, low-oil|74|2.7|8|3.5|
آش گردو پرروغن رستورانی|Walnut ash, rich restaurant-style|109|3|8|7.2|
آش دوغ زنجان|Zanjan doogh ash|64|2.6|8|2.4|
آش دوغ زنجان کم‌روغن|Zanjan doogh ash, low-oil|49|2.3|8|0.9|
آش دوغ زنجان پرروغن رستورانی|Zanjan doogh ash, rich restaurant-style|84|2.6|8|4.6|
آش ورمیشل|Vermicelli ash|82|3|12|2.4|
آش ورمیشل کم‌روغن|Vermicelli ash, low-oil|67|2.7|12|0.9|
آش ورمیشل پرروغن رستورانی|Vermicelli ash, rich restaurant-style|101|3|12|4.6|
آش شیر و برنج|Rice milk ash|80|2.6|12|2.4|
آش شیر و برنج کم‌روغن|Rice milk ash, low-oil|65|2.3|12|0.9|
آش شیر و برنج پرروغن رستورانی|Rice milk ash, rich restaurant-style|100|2.6|12|4.6|
آش زرشک|Zereshk ash|77|2.8|11|2.4|
آش زرشک کم‌روغن|Zereshk ash, low-oil|62|2.5|11|0.9|
آش زرشک پرروغن رستورانی|Zereshk ash, rich restaurant-style|97|2.8|11|4.6|
آش تره|Tareh ash|65|2.8|8|2.4|
آش تره کم‌روغن|Tareh ash, low-oil|50|2.5|8|0.9|
آش تره پرروغن رستورانی|Tareh ash, rich restaurant-style|85|2.8|8|4.6|
آش ارده|Ardeh ash|84|3|10|3.5|
آش ارده کم‌روغن|Ardeh ash, low-oil|69|2.7|10|2|
آش ارده پرروغن رستورانی|Ardeh ash, rich restaurant-style|103|3|10|5.7|
آش خمیر|Khamir ash|81|2.8|13|2|
آش خمیر کم‌روغن|Khamir ash, low-oil|67|2.5|13|0.5|
آش خمیر پرروغن رستورانی|Khamir ash, rich restaurant-style|101|2.8|13|4.2|
آش کاچی|Kachi ash|93|2.5|14|3|
آش کاچی کم‌روغن|Kachi ash, low-oil|78|2.2|14|1.5|
آش کاچی پرروغن رستورانی|Kachi ash, rich restaurant-style|113|2.5|14|5.2|
آش اوماج|Omaj ash|77|2.8|12|2|
آش اوماج کم‌روغن|Omaj ash, low-oil|63|2.5|12|0.5|
آش اوماج پرروغن رستورانی|Omaj ash, rich restaurant-style|97|2.8|12|4.2|
آش پیچاق|Pichagh ash|83|3.4|12|2.4|
آش پیچاق کم‌روغن|Pichagh ash, low-oil|69|3.1|12|0.9|
آش پیچاق پرروغن رستورانی|Pichagh ash, rich restaurant-style|103|3.4|12|4.6|
آش جوش|Josh ash|66|3.2|8|2.4|
آش جوش کم‌روغن|Josh ash, low-oil|52|2.9|8|0.9|
آش جوش پرروغن رستورانی|Josh ash, rich restaurant-style|86|3.2|8|4.6|
آش بزغاله|Kid goat ash|77|4.5|8|3|
آش بزغاله کم‌روغن|Kid goat ash, low-oil|62|4.2|8|1.5|
آش بزغاله پرروغن رستورانی|Kid goat ash, rich restaurant-style|97|4.5|8|5.2|
آش دندونی|Dandooni ash|76|2.6|12|2|
آش دندونی کم‌روغن|Dandooni ash, low-oil|62|2.3|12|0.5|
آش دندونی پرروغن رستورانی|Dandooni ash, rich restaurant-style|96|2.6|12|4.2|
آش ماست خورک|Mast khorak ash|76|3.2|9|3|
آش ماست خورک کم‌روغن|Mast khorak ash, low-oil|61|2.9|9|1.5|
آش ماست خورک پرروغن رستورانی|Mast khorak ash, rich restaurant-style|96|3.2|9|5.2|
آش شیرازی|Shirazi ash|74|3|10|2.4|
آش شیرازی کم‌روغن|Shirazi ash, low-oil|59|2.7|10|0.9|
آش شیرازی پرروغن رستورانی|Shirazi ash, rich restaurant-style|93|3|10|4.6|
آش خاگینه|Khagineh ash|72|3.2|8|3|
آش خاگینه کم‌روغن|Khagineh ash, low-oil|57|2.9|8|1.5|
آش خاگینه پرروغن رستورانی|Khagineh ash, rich restaurant-style|92|3.2|8|5.2|
آش دوغ کردی|Kurdish doogh ash|70|2.8|9|2.5|
آش دوغ کردی کم‌روغن|Kurdish doogh ash, low-oil|55|2.5|9|1|
آش دوغ کردی پرروغن رستورانی|Kurdish doogh ash, rich restaurant-style|90|2.8|9|4.7|
آش بوراک|Burak ash|89|3.4|12|3|
آش بوراک کم‌روغن|Burak ash, low-oil|74|3.1|12|1.5|
`;
const B = `
آش بوراک پرروغن رستورانی|Burak ash, rich restaurant-style|108|3.4|12|5.2|
آش گیلانی ترش|Gilan sour ash|65|2.8|8|2.4|
آش گیلانی ترش کم‌روغن|Gilan sour ash, low-oil|50|2.5|8|0.9|
آش گیلانی ترش پرروغن رستورانی|Gilan sour ash, rich restaurant-style|85|2.8|8|4.6|
آش ماستاوا|Mastava ash|82|3|12|2.4|
آش ماستاوا کم‌روغن|Mastava ash, low-oil|67|2.7|12|0.9|
آش ماستاوا پرروغن رستورانی|Mastava ash, rich restaurant-style|101|3|12|4.6|
آش پره|Pareh ash|71|3|9|2.6|
آش پره کم‌روغن|Pareh ash, low-oil|57|2.7|9|1.1|
آش پره پرروغن رستورانی|Pareh ash, rich restaurant-style|91|3|9|4.8|
آش بادام|Almond ash|80|3|8|4|
آش بادام کم‌روغن|Almond ash, low-oil|65|2.7|8|2.5|
آش بادام پرروغن رستورانی|Almond ash, rich restaurant-style|100|3|8|6.2|
آش جو ماش|Barley mung ash|77|3.4|11|2.2|
آش جو ماش کم‌روغن|Barley mung ash, low-oil|63|3.1|11|0.7|
آش جو ماش پرروغن رستورانی|Barley mung ash, rich restaurant-style|97|3.4|11|4.4|
آش کنگر|Artichoke ash|61|2.4|8|2.2|
آش کنگر کم‌روغن|Artichoke ash, low-oil|47|2.1|8|0.7|
آش کنگر پرروغن رستورانی|Artichoke ash, rich restaurant-style|81|2.4|8|4.4|
آش ماهی|Fish ash|67|4|6|3|
آش ماهی کم‌روغن|Fish ash, low-oil|52|3.7|6|1.5|
آش ماهی پرروغن رستورانی|Fish ash, rich restaurant-style|87|4|6|5.2|
آش ورزنه|Varzaneh ash|74|3|10|2.4|
آش ورزنه کم‌روغن|Varzaneh ash, low-oil|59|2.7|10|0.9|
آش ورزنه پرروغن رستورانی|Varzaneh ash, rich restaurant-style|93|3|10|4.6|
آش کوفته|Kufteh ash|80|4.2|9|3|
آش کوفته کم‌روغن|Kufteh ash, low-oil|65|3.9|9|1.5|
آش کوفته پرروغن رستورانی|Kufteh ash, rich restaurant-style|100|4.2|9|5.2|
سوپ جو کم‌روغن|Barley soup, low-oil|43|2.1|8|0.3|سوپ جو ایرانی
سوپ جو پرروغن رستورانی|Barley soup, rich restaurant-style|78|2.4|8|4|سوپ جو ایرانی
سوپ جو با مرغ کم‌روغن|Barley soup with chicken, low-oil|51|3.7|8|0.5|
سوپ جو با مرغ پرروغن رستورانی|Barley soup with chicken, rich restaurant-style|86|4|8|4.2|
سوپ مرغ و سبزیجات کم‌روغن|Chicken vegetable soup, low-oil|39|3.7|5|0.5|
سوپ مرغ و سبزیجات پرروغن رستورانی|Chicken vegetable soup, rich restaurant-style|74|4|5|4.2|
سوپ قارچ خامه‌ای|Cream of mushroom soup|68|2|6|4|
سوپ قارچ خامه‌ای کم‌روغن|Cream of mushroom soup, low-oil|53|1.7|6|2.5|
سوپ قارچ خامه‌ای پرروغن رستورانی|Cream of mushroom soup, rich restaurant-style|88|2|6|6.2|
سوپ ماکارونی|Macaroni soup|64|2.5|9|2|
سوپ ماکارونی کم‌روغن|Macaroni soup, low-oil|49|2.2|9|0.5|
سوپ ماکارونی پرروغن رستورانی|Macaroni soup, rich restaurant-style|84|2.5|9|4.2|
سوپ ورمیشل کم‌روغن|Vermicelli soup, low-oil|47|2.1|9|0.3|
سوپ ورمیشل پرروغن رستورانی|Vermicelli soup, rich restaurant-style|82|2.4|9|4|
سوپ شیر کم‌روغن|Milk soup, low-oil|52|2.7|7|1.5|
سوپ شیر پرروغن رستورانی|Milk soup, rich restaurant-style|87|3|7|5.2|
سوپ شیر و سبزی|Milk herb soup|63|3|6|3|
سوپ شیر و سبزی کم‌روغن|Milk herb soup, low-oil|48|2.7|6|1.5|
سوپ شیر و سبزی پرروغن رستورانی|Milk herb soup, rich restaurant-style|83|3|6|5.2|
سوپ عدس کم‌روغن|Lentil soup, low-oil|64|4.2|11|0.3|
سوپ عدس پرروغن رستورانی|Lentil soup, rich restaurant-style|98|4.5|11|4|
سوپ عدس قرمز|Red lentil soup|85|4.8|12|2|
سوپ عدس قرمز کم‌روغن|Red lentil soup, low-oil|71|4.5|12|0.5|
سوپ عدس قرمز پرروغن رستورانی|Red lentil soup, rich restaurant-style|105|4.8|12|4.2|
سوپ لپه|Split pea soup|80|4|12|1.8|
سوپ لپه کم‌روغن|Split pea soup, low-oil|66|3.7|12|0.3|
سوپ لپه پرروغن رستورانی|Split pea soup, rich restaurant-style|100|4|12|4|
سوپ نخود|Chickpea soup|78|4|11|2|
سوپ نخود کم‌روغن|Chickpea soup, low-oil|63|3.7|11|0.5|
سوپ نخود پرروغن رستورانی|Chickpea soup, rich restaurant-style|98|4|11|4.2|
سوپ بلغور|Bulgur soup|73|3.2|11|1.8|
سوپ بلغور کم‌روغن|Bulgur soup, low-oil|58|2.9|11|0.3|
سوپ بلغور پرروغن رستورانی|Bulgur soup, rich restaurant-style|93|3.2|11|4|
سوپ گوجه کم‌روغن|Tomato soup, low-oil|33|1.2|6|0.5|
سوپ گوجه پرروغن رستورانی|Tomato soup, rich restaurant-style|68|1.5|6|4.2|
سوپ گوجه با خامه|Tomato soup with cream|67|1.8|6|4|
سوپ گوجه با خامه کم‌روغن|Tomato soup with cream, low-oil|53|1.5|6|2.5|
سوپ گوجه با خامه پرروغن رستورانی|Tomato soup with cream, rich restaurant-style|87|1.8|6|6.2|
سوپ سبزیجات کم‌روغن|Vegetable soup, low-oil|26|1.2|5|0.1|
سوپ سبزیجات پرروغن رستورانی|Vegetable soup, rich restaurant-style|59|1.5|5|3.7|
سوپ کدو حلوایی کم‌روغن|Pumpkin soup, low-oil|41|1.1|8|0.5|
سوپ کدو حلوایی پرروغن رستورانی|Pumpkin soup, rich restaurant-style|75|1.4|8|4.2|
سوپ هویج|Carrot soup|51|1.2|7|2|
سوپ هویج کم‌روغن|Carrot soup, low-oil|36|0.9|7|0.5|
سوپ هویج پرروغن رستورانی|Carrot soup, rich restaurant-style|71|1.2|7|4.2|
سوپ سیب‌زمینی کم‌روغن|Potato soup, low-oil|49|1.7|9|0.7|
سوپ سیب‌زمینی پرروغن رستورانی|Potato soup, rich restaurant-style|84|2|9|4.4|
سوپ جو با قارچ|Barley mushroom soup|62|3|8|2|
سوپ جو با قارچ کم‌روغن|Barley mushroom soup, low-oil|47|2.7|8|0.5|
سوپ جو با قارچ پرروغن رستورانی|Barley mushroom soup, rich restaurant-style|82|3|8|4.2|
سوپ اسفناج|Spinach soup|44|2.4|4|2|
سوپ اسفناج کم‌روغن|Spinach soup, low-oil|29|2.1|4|0.5|
سوپ اسفناج پرروغن رستورانی|Spinach soup, rich restaurant-style|63|2.4|4|4.2|
سوپ ذرت|Corn soup|70|2|11|2|
سوپ ذرت کم‌روغن|Corn soup, low-oil|55|1.7|11|0.5|
سوپ ذرت پرروغن رستورانی|Corn soup, rich restaurant-style|90|2|11|4.2|
سوپ گوشت و سبزی|Meat vegetable soup|62|4|6|2.4|
سوپ گوشت و سبزی کم‌روغن|Meat vegetable soup, low-oil|47|3.7|6|0.9|
سوپ گوشت و سبزی پرروغن رستورانی|Meat vegetable soup, rich restaurant-style|81|4|6|4.6|
سوپ مرغ و ذرت|Chicken corn soup|68|3.6|9|2|
سوپ مرغ و ذرت کم‌روغن|Chicken corn soup, low-oil|54|3.3|9|0.5|
سوپ مرغ و ذرت پرروغن رستورانی|Chicken corn soup, rich restaurant-style|88|3.6|9|4.2|
سوپ مرغ و رشته|Chicken noodle soup|64|3.6|8|2|
سوپ مرغ و رشته کم‌روغن|Chicken noodle soup, low-oil|50|3.3|8|0.5|
سوپ مرغ و رشته پرروغن رستورانی|Chicken noodle soup, rich restaurant-style|84|3.6|8|4.2|
سوپ تخم‌مرغ|Egg drop soup|44|3|3|2.2|
سوپ تخم‌مرغ کم‌روغن|Egg drop soup, low-oil|29|2.7|3|0.7|
سوپ تخم‌مرغ پرروغن رستورانی|Egg drop soup, rich restaurant-style|64|3|3|4.4|
سوپ بروکلی|Broccoli soup|51|2.4|5|2.4|
سوپ بروکلی کم‌روغن|Broccoli soup, low-oil|37|2.1|5|0.9|
سوپ بروکلی پرروغن رستورانی|Broccoli soup, rich restaurant-style|71|2.4|5|4.6|
سوپ پیاز کم‌روغن|Onion soup, low-oil|37|1.2|7|0.5|
سوپ پیاز پرروغن رستورانی|Onion soup, rich restaurant-style|72|1.5|7|4.2|
سوپ زنجبیل و مرغ|Ginger chicken soup|44|3.6|3|2|
سوپ زنجبیل و مرغ کم‌روغن|Ginger chicken soup, low-oil|30|3.3|3|0.5|
سوپ زنجبیل و مرغ پرروغن رستورانی|Ginger chicken soup, rich restaurant-style|64|3.6|3|4.2|
سوپ لوبیا کم‌روغن|Bean soup, low-oil|62|3.7|11|0.3|
سوپ لوبیا پرروغن رستورانی|Bean soup, rich restaurant-style|96|4|11|4|
سوپ ماهی کم‌روغن|Fish soup, low-oil|32|3.9|3|0.5|
سوپ ماهی پرروغن رستورانی|Fish soup, rich restaurant-style|67|4.2|3|4.2|
سوپ جعفری|Parsley soup|42|2|4|2|
سوپ جعفری کم‌روغن|Parsley soup, low-oil|27|1.7|4|0.5|
سوپ جعفری پرروغن رستورانی|Parsley soup, rich restaurant-style|62|2|4|4.2|
سوپ شلغم|Turnip soup|47|1.6|6|1.8|
سوپ شلغم کم‌روغن|Turnip soup, low-oil|32|1.3|6|0.3|
سوپ شلغم پرروغن رستورانی|Turnip soup, rich restaurant-style|66|1.6|6|4|
سوپ جو پرک|Oat barley soup|66|3|9|2|
سوپ جو پرک کم‌روغن|Oat barley soup, low-oil|51|2.7|9|0.5|
سوپ جو پرک پرروغن رستورانی|Oat barley soup, rich restaurant-style|86|3|9|4.2|
سوپ کلم کم‌روغن|Cabbage soup, low-oil|29|1.5|5|0.3|
سوپ کلم پرروغن رستورانی|Cabbage soup, rich restaurant-style|63|1.8|5|4|
سوپ بلدرچین|Quail soup|59|5|3|3|
سوپ بلدرچین کم‌روغن|Quail soup, low-oil|44|4.7|3|1.5|
سوپ بلدرچین پرروغن رستورانی|Quail soup, rich restaurant-style|79|5|3|5.2|
سوپ گندم|Wheat soup|72|3|11|1.8|
سوپ گندم کم‌روغن|Wheat soup, low-oil|58|2.7|11|0.3|
سوپ گندم پرروغن رستورانی|Wheat soup, rich restaurant-style|92|3|11|4|
سوپ رشته فرنگی|Noodle soup|63|2.6|9|1.8|
سوپ رشته فرنگی کم‌روغن|Noodle soup, low-oil|48|2.3|9|0.3|
سوپ رشته فرنگی پرروغن رستورانی|Noodle soup, rich restaurant-style|82|2.6|9|4|
سوپ کدو سبز|Zucchini soup|44|1.6|5|2|
سوپ کدو سبز کم‌روغن|Zucchini soup, low-oil|30|1.3|5|0.5|
سوپ کدو سبز پرروغن رستورانی|Zucchini soup, rich restaurant-style|64|1.6|5|4.2|
سوپ فرنگی|Farangi soup|60|2.4|7|2.5|
سوپ فرنگی کم‌روغن|Farangi soup, low-oil|45|2.1|7|1|
سوپ فرنگی پرروغن رستورانی|Farangi soup, rich restaurant-style|80|2.4|7|4.7|
کباب کوبیده گوسفندی زغالی|Lamb koobideh, charcoal|252|17|1|20|
کباب کوبیده گوسفندی تابه‌ای|Lamb koobideh, pan-cooked|266|17|1|21.6|
کباب کوبیده گوسفندی فر|Lamb koobideh, oven-baked|245|17|1|19.2|
کباب کوبیده گوسفندی ایرفرایر|Lamb koobideh, air fryer|234|17|1|18|
کباب کوبیده گاو زغالی|Beef koobideh, charcoal|201|20|1|13|
کباب کوبیده گاو تابه‌ای|Beef koobideh, pan-cooked|215|20|1|14.6|
کباب کوبیده گاو فر|Beef koobideh, oven-baked|194|20|1|12.2|
کباب کوبیده گاو ایرفرایر|Beef koobideh, air fryer|183|20|1|11|
کباب کوبیده مخلوط زغالی|Mixed koobideh, charcoal|224|19|1|16|
کباب کوبیده مخلوط تابه‌ای|Mixed koobideh, pan-cooked|238|19|1|17.6|
کباب کوبیده مخلوط فر|Mixed koobideh, oven-baked|217|19|1|15.2|
کباب کوبیده مخلوط ایرفرایر|Mixed koobideh, air fryer|206|19|1|14|
کباب کوبیده مرغ زغالی|Chicken koobideh, charcoal|156|20|1|8|
کباب کوبیده مرغ تابه‌ای|Chicken koobideh, pan-cooked|170|20|1|9.6|
کباب کوبیده مرغ فر|Chicken koobideh, oven-baked|149|20|1|7.2|
کباب کوبیده مرغ ایرفرایر|Chicken koobideh, air fryer|138|20|1|6|
کباب کوبیده بوقلمون زغالی|Turkey koobideh, charcoal|142|21|1|6|
کباب کوبیده بوقلمون تابه‌ای|Turkey koobideh, pan-cooked|156|21|1|7.6|
کباب کوبیده بوقلمون فر|Turkey koobideh, oven-baked|135|21|1|5.2|
کباب کوبیده بوقلمون ایرفرایر|Turkey koobideh, air fryer|124|21|1|4|
کباب کوبیده ماهی زغالی|Fish koobideh, charcoal|134|19|1|6|
کباب کوبیده ماهی تابه‌ای|Fish koobideh, pan-cooked|148|19|1|7.6|
کباب کوبیده ماهی فر|Fish koobideh, oven-baked|127|19|1|5.2|
کباب کوبیده ماهی ایرفرایر|Fish koobideh, air fryer|116|19|1|4|
کباب برگ گوسفندی زغالی|Lamb barg kabab, charcoal|204|24|0|12|
کباب برگ گوسفندی تابه‌ای|Lamb barg kabab, pan-cooked|218|24|0|13.6|
کباب برگ گوسفندی فر|Lamb barg kabab, oven-baked|197|24|0|11.2|
کباب برگ گوسفندی ایرفرایر|Lamb barg kabab, air fryer|186|24|0|10|
کباب برگ گاو زغالی|Beef barg kabab, charcoal|189|27|0|9|
کباب برگ گاو تابه‌ای|Beef barg kabab, pan-cooked|203|27|0|10.6|
کباب برگ گاو فر|Beef barg kabab, oven-baked|182|27|0|8.2|
کباب برگ گاو ایرفرایر|Beef barg kabab, air fryer|171|27|0|7|
کباب برگ مرغ زغالی|Chicken barg kabab, charcoal|157|28|0|5|
کباب برگ مرغ تابه‌ای|Chicken barg kabab, pan-cooked|171|28|0|6.6|
کباب برگ مرغ فر|Chicken barg kabab, oven-baked|150|28|0|4.2|
کباب برگ مرغ ایرفرایر|Chicken barg kabab, air fryer|139|28|0|3|
کباب سلطانی گوشت زغالی|Soltani kabab, charcoal|227|22|1|15|
کباب سلطانی گوشت تابه‌ای|Soltani kabab, pan-cooked|241|22|1|16.6|
کباب سلطانی گوشت فر|Soltani kabab, oven-baked|220|22|1|14.2|
کباب سلطانی گوشت ایرفرایر|Soltani kabab, air fryer|209|22|1|13|
کباب بختیاری زغالی|Bakhtiari kabab, charcoal|190|25|0|10|
کباب بختیاری تابه‌ای|Bakhtiari kabab, pan-cooked|204|25|0|11.6|
کباب بختیاری فر|Bakhtiari kabab, oven-baked|183|25|0|9.2|
کباب بختیاری ایرفرایر|Bakhtiari kabab, air fryer|172|25|0|8|
کباب وزیری زغالی|Vaziri kabab, charcoal|190|25|0|10|
کباب وزیری تابه‌ای|Vaziri kabab, pan-cooked|204|25|0|11.6|
کباب وزیری فر|Vaziri kabab, oven-baked|183|25|0|9.2|
کباب وزیری ایرفرایر|Vaziri kabab, air fryer|172|25|0|8|
کباب چنجه گوسفندی زغالی|Lamb chenjeh, charcoal|209|23|0|13|چنجه
کباب چنجه گوسفندی تابه‌ای|Lamb chenjeh, pan-cooked|223|23|0|14.6|چنجه
کباب چنجه گوسفندی فر|Lamb chenjeh, oven-baked|202|23|0|12.2|چنجه
کباب چنجه گوسفندی ایرفرایر|Lamb chenjeh, air fryer|191|23|0|11|چنجه
کباب چنجه گاو زغالی|Beef chenjeh, charcoal|185|26|0|9|
کباب چنجه گاو تابه‌ای|Beef chenjeh, pan-cooked|199|26|0|10.6|
کباب چنجه گاو فر|Beef chenjeh, oven-baked|178|26|0|8.2|
کباب چنجه گاو ایرفرایر|Beef chenjeh, air fryer|167|26|0|7|
کباب حسینی زغالی|Hosseini kabab, charcoal|209|21|2|13|
کباب حسینی تابه‌ای|Hosseini kabab, pan-cooked|223|21|2|14.6|
کباب حسینی فر|Hosseini kabab, oven-baked|202|21|2|12.2|
کباب حسینی ایرفرایر|Hosseini kabab, air fryer|191|21|2|11|
کباب تابه‌ای زغالی|Tabei kabab, charcoal|215|18|2|15|
کباب تابه‌ای تابه‌ای|Tabei kabab, pan-cooked|229|18|2|16.6|
کباب تابه‌ای فر|Tabei kabab, oven-baked|208|18|2|14.2|
کباب تابه‌ای ایرفرایر|Tabei kabab, air fryer|197|18|2|13|
کباب لقمه زغالی|Loghmeh kabab, charcoal|204|24|0|12|
کباب لقمه تابه‌ای|Loghmeh kabab, pan-cooked|218|24|0|13.6|
کباب لقمه فر|Loghmeh kabab, oven-baked|197|24|0|11.2|
کباب لقمه ایرفرایر|Loghmeh kabab, air fryer|186|24|0|10|
کباب شیشلیک زغالی|Shishlik, charcoal|222|24|0|14|شیشلیک
کباب شیشلیک تابه‌ای|Shishlik, pan-cooked|236|24|0|15.6|شیشلیک
کباب شیشلیک فر|Shishlik, oven-baked|215|24|0|13.2|شیشلیک
کباب شیشلیک ایرفرایر|Shishlik, air fryer|204|24|0|12|شیشلیک
کباب دنده زغالی|Rib kabab, charcoal|296|20|0|24|
کباب دنده تابه‌ای|Rib kabab, pan-cooked|310|20|0|25.6|
کباب دنده فر|Rib kabab, oven-baked|289|20|0|23.2|
کباب دنده ایرفرایر|Rib kabab, air fryer|278|20|0|22|
کباب ماهیچه زغالی|Shank kabab, charcoal|223|22|0|15|
کباب ماهیچه تابه‌ای|Shank kabab, pan-cooked|237|22|0|16.6|
کباب ماهیچه فر|Shank kabab, oven-baked|216|22|0|14.2|
کباب ماهیچه ایرفرایر|Shank kabab, air fryer|205|22|0|13|
کباب ترش گیلانی زغالی|Gilaki torsh kabab, charcoal|190|19|6|10|کباب ترش
کباب ترش گیلانی تابه‌ای|Gilaki torsh kabab, pan-cooked|204|19|6|11.6|کباب ترش
کباب ترش گیلانی فر|Gilaki torsh kabab, oven-baked|183|19|6|9.2|کباب ترش
کباب ترش گیلانی ایرفرایر|Gilaki torsh kabab, air fryer|172|19|6|8|کباب ترش
کباب شیرازی زغالی|Shirazi kabab, charcoal|208|24|1|12|
کباب شیرازی تابه‌ای|Shirazi kabab, pan-cooked|222|24|1|13.6|
کباب شیرازی فر|Shirazi kabab, oven-baked|201|24|1|11.2|
کباب شیرازی ایرفرایر|Shirazi kabab, air fryer|190|24|1|10|
کباب تبریزی زغالی|Tabrizi kabab, charcoal|214|20|2|14|
کباب تبریزی تابه‌ای|Tabrizi kabab, pan-cooked|228|20|2|15.6|
کباب تبریزی فر|Tabrizi kabab, oven-baked|207|20|2|13.2|
کباب تبریزی ایرفرایر|Tabrizi kabab, air fryer|196|20|2|12|
کباب قفقازی زغالی|Caucasian kabab, charcoal|209|22|1|13|
کباب قفقازی تابه‌ای|Caucasian kabab, pan-cooked|223|22|1|14.6|
کباب قفقازی فر|Caucasian kabab, oven-baked|202|22|1|12.2|
کباب قفقازی ایرفرایر|Caucasian kabab, air fryer|191|22|1|11|
کباب کردی زغالی|Kurdish kabab, charcoal|223|21|1|15|
کباب کردی تابه‌ای|Kurdish kabab, pan-cooked|237|21|1|16.6|
کباب کردی فر|Kurdish kabab, oven-baked|216|21|1|14.2|
کباب کردی ایرفرایر|Kurdish kabab, air fryer|205|21|1|13|
کباب بناب زغالی|Bonab kabab, charcoal|228|20|1|16|
کباب بناب تابه‌ای|Bonab kabab, pan-cooked|242|20|1|17.6|
کباب بناب فر|Bonab kabab, oven-baked|221|20|1|15.2|
کباب بناب ایرفرایر|Bonab kabab, air fryer|210|20|1|14|
کباب مراغه‌ای زغالی|Maraghe kabab, charcoal|219|20|1|15|
کباب مراغه‌ای تابه‌ای|Maraghe kabab, pan-cooked|233|20|1|16.6|
کباب مراغه‌ای فر|Maraghe kabab, oven-baked|212|20|1|14.2|
کباب مراغه‌ای ایرفرایر|Maraghe kabab, air fryer|201|20|1|13|
کباب ارمنی زغالی|Armenian kabab, charcoal|214|20|2|14|
کباب ارمنی تابه‌ای|Armenian kabab, pan-cooked|228|20|2|15.6|
کباب ارمنی فر|Armenian kabab, oven-baked|207|20|2|13.2|
کباب ارمنی ایرفرایر|Armenian kabab, air fryer|196|20|2|12|
کباب بلغاری زغالی|Bulgarian kabab, charcoal|237|19|2|17|
کباب بلغاری تابه‌ای|Bulgarian kabab, pan-cooked|251|19|2|18.6|
کباب بلغاری فر|Bulgarian kabab, oven-baked|230|19|2|16.2|
کباب بلغاری ایرفرایر|Bulgarian kabab, air fryer|219|19|2|15|
کباب دیگی زغالی|Digi kabab, charcoal|200|20|3|12|
کباب دیگی تابه‌ای|Digi kabab, pan-cooked|214|20|3|13.6|
کباب دیگی فر|Digi kabab, oven-baked|193|20|3|11.2|
کباب دیگی ایرفرایر|Digi kabab, air fryer|182|20|3|10|
کباب سینه مرغ زغالی|Chicken breast kabab, charcoal|152|29|0|4|
کباب سینه مرغ تابه‌ای|Chicken breast kabab, pan-cooked|166|29|0|5.6|
کباب سینه مرغ فر|Chicken breast kabab, oven-baked|145|29|0|3.2|
کباب سینه مرغ ایرفرایر|Chicken breast kabab, air fryer|134|29|0|2|
کباب ران مرغ زغالی|Chicken thigh kabab, charcoal|177|24|0|9|
کباب ران مرغ تابه‌ای|Chicken thigh kabab, pan-cooked|191|24|0|10.6|
کباب ران مرغ فر|Chicken thigh kabab, oven-baked|170|24|0|8.2|
کباب ران مرغ ایرفرایر|Chicken thigh kabab, air fryer|159|24|0|7|
جوجه کباب با استخوان زغالی|Bone-in joojeh kabab, charcoal|164|22|1|8|
جوجه کباب با استخوان تابه‌ای|Bone-in joojeh kabab, pan-cooked|178|22|1|9.6|
جوجه کباب با استخوان فر|Bone-in joojeh kabab, oven-baked|157|22|1|7.2|
جوجه کباب با استخوان ایرفرایر|Bone-in joojeh kabab, air fryer|146|22|1|6|
جوجه کباب بی‌استخوان زغالی|Boneless joojeh kabab, charcoal|175|27|1|7|
جوجه کباب بی‌استخوان تابه‌ای|Boneless joojeh kabab, pan-cooked|189|27|1|8.6|
جوجه کباب بی‌استخوان فر|Boneless joojeh kabab, oven-baked|168|27|1|6.2|
جوجه کباب بی‌استخوان ایرفرایر|Boneless joojeh kabab, air fryer|157|27|1|5|
جوجه کباب زعفرانی زغالی|Saffron joojeh kabab, charcoal|171|26|1|7|
جوجه کباب زعفرانی تابه‌ای|Saffron joojeh kabab, pan-cooked|185|26|1|8.6|
جوجه کباب زعفرانی فر|Saffron joojeh kabab, oven-baked|164|26|1|6.2|
جوجه کباب زعفرانی ایرفرایر|Saffron joojeh kabab, air fryer|153|26|1|5|
جوجه کباب ترش زغالی|Sour joojeh kabab, charcoal|184|25|3|8|
جوجه کباب ترش تابه‌ای|Sour joojeh kabab, pan-cooked|198|25|3|9.6|
جوجه کباب ترش فر|Sour joojeh kabab, oven-baked|177|25|3|7.2|
جوجه کباب ترش ایرفرایر|Sour joojeh kabab, air fryer|166|25|3|6|
جوجه کباب ماستی زغالی|Yogurt joojeh kabab, charcoal|180|25|2|8|
جوجه کباب ماستی تابه‌ای|Yogurt joojeh kabab, pan-cooked|194|25|2|9.6|
جوجه کباب ماستی فر|Yogurt joojeh kabab, oven-baked|173|25|2|7.2|
جوجه کباب ماستی ایرفرایر|Yogurt joojeh kabab, air fryer|162|25|2|6|
جوجه کباب با سس انار زغالی|Pomegranate joojeh kabab, charcoal|192|25|5|8|
جوجه کباب با سس انار تابه‌ای|Pomegranate joojeh kabab, pan-cooked|206|25|5|9.6|
جوجه کباب با سس انار فر|Pomegranate joojeh kabab, oven-baked|185|25|5|7.2|
جوجه کباب با سس انار ایرفرایر|Pomegranate joojeh kabab, air fryer|174|25|5|6|
جوجه کباب با فلفل زغالی|Pepper joojeh kabab, charcoal|184|26|2|8|
جوجه کباب با فلفل تابه‌ای|Pepper joojeh kabab, pan-cooked|198|26|2|9.6|
جوجه کباب با فلفل فر|Pepper joojeh kabab, oven-baked|177|26|2|7.2|
جوجه کباب با فلفل ایرفرایر|Pepper joojeh kabab, air fryer|166|26|2|6|
بال مرغ کبابی زغالی|Grilled chicken wings, charcoal|209|22|1|13|کباب بال
بال مرغ کبابی تابه‌ای|Grilled chicken wings, pan-cooked|223|22|1|14.6|کباب بال
بال مرغ کبابی فر|Grilled chicken wings, oven-baked|202|22|1|12.2|کباب بال
بال مرغ کبابی ایرفرایر|Grilled chicken wings, air fryer|191|22|1|11|کباب بال
کباب بوقلمون زغالی|Turkey kabab, charcoal|153|26|1|5|
کباب بوقلمون تابه‌ای|Turkey kabab, pan-cooked|167|26|1|6.6|
کباب بوقلمون فر|Turkey kabab, oven-baked|146|26|1|4.2|
کباب بوقلمون ایرفرایر|Turkey kabab, air fryer|135|26|1|3|
کباب ماهی سالمون زغالی|Salmon kabab, charcoal|191|22|1|11|
کباب ماهی سالمون تابه‌ای|Salmon kabab, pan-cooked|205|22|1|12.6|
کباب ماهی سالمون فر|Salmon kabab, oven-baked|184|22|1|10.2|
کباب ماهی سالمون ایرفرایر|Salmon kabab, air fryer|173|22|1|9|
کباب ماهی هوور زغالی|Hoover fish kabab, charcoal|146|22|1|6|
کباب ماهی هوور تابه‌ای|Hoover fish kabab, pan-cooked|160|22|1|7.6|
کباب ماهی هوور فر|Hoover fish kabab, oven-baked|139|22|1|5.2|
کباب ماهی هوور ایرفرایر|Hoover fish kabab, air fryer|128|22|1|4|
کباب میگو زغالی|Shrimp kabab, charcoal|120|20|1|4|
کباب میگو تابه‌ای|Shrimp kabab, pan-cooked|134|20|1|5.6|
کباب میگو فر|Shrimp kabab, oven-baked|113|20|1|3.2|
کباب میگو ایرفرایر|Shrimp kabab, air fryer|102|20|1|2|
کباب قلب زغالی|Heart kabab, charcoal|156|20|1|8|
کباب قلب تابه‌ای|Heart kabab, pan-cooked|170|20|1|9.6|
کباب قلب فر|Heart kabab, oven-baked|149|20|1|7.2|
کباب قلب ایرفرایر|Heart kabab, air fryer|138|20|1|6|
کباب جگر زغالی|Liver kabab, charcoal|172|22|3|8|جگر کبابی
کباب جگر تابه‌ای|Liver kabab, pan-cooked|186|22|3|9.6|جگر کبابی
کباب جگر فر|Liver kabab, oven-baked|165|22|3|7.2|جگر کبابی
کباب جگر ایرفرایر|Liver kabab, air fryer|154|22|3|6|جگر کبابی
کباب دل‌ه‌قلوه زغالی|Kidney kabab, charcoal|147|20|1|7|
کباب دل‌ه‌قلوه تابه‌ای|Kidney kabab, pan-cooked|161|20|1|8.6|
کباب دل‌ه‌قلوه فر|Kidney kabab, oven-baked|140|20|1|6.2|
کباب دل‌ه‌قلوه ایرفرایر|Kidney kabab, air fryer|129|20|1|5|
کباب بادمجان زغالی|Eggplant kabab, charcoal|86|2|6|6|
کباب بادمجان تابه‌ای|Eggplant kabab, pan-cooked|100|2|6|7.6|
کباب بادمجان فر|Eggplant kabab, oven-baked|79|2|6|5.2|
کباب بادمجان ایرفرایر|Eggplant kabab, air fryer|68|2|6|4|
کباب گوجه‌فرنگی زغالی|Grilled tomato, charcoal|23|1|4|0.3|گوجه کبابی
کباب گوجه‌فرنگی تابه‌ای|Grilled tomato, pan-cooked|37|1|4|1.9|گوجه کبابی
کباب گوجه‌فرنگی فر|Grilled tomato, oven-baked|21|1|4|0.1|گوجه کبابی
کباب گوجه‌فرنگی ایرفرایر|Grilled tomato, air fryer|21|1|4|0.1|گوجه کبابی
کباب قارچ زغالی|Mushroom kabab, charcoal|73|3|4|5|
کباب قارچ تابه‌ای|Mushroom kabab, pan-cooked|87|3|4|6.6|
کباب قارچ فر|Mushroom kabab, oven-baked|66|3|4|4.2|
کباب قارچ ایرفرایر|Mushroom kabab, air fryer|55|3|4|3|
کباب کدو زغالی|Zucchini kabab, charcoal|73|2|5|5|
کباب کدو تابه‌ای|Zucchini kabab, pan-cooked|87|2|5|6.6|
کباب کدو فر|Zucchini kabab, oven-baked|66|2|5|4.2|
کباب کدو ایرفرایر|Zucchini kabab, air fryer|55|2|5|3|
کباب سبزیجات زغالی|Mixed vegetable kabab, charcoal|81|2|7|5|
کباب سبزیجات تابه‌ای|Mixed vegetable kabab, pan-cooked|95|2|7|6.6|
کباب سبزیجات فر|Mixed vegetable kabab, oven-baked|74|2|7|4.2|
کباب سبزیجات ایرفرایر|Mixed vegetable kabab, air fryer|63|2|7|3|
کباب سویا زغالی|Soy kabab, charcoal|158|16|10|6|
کباب سویا تابه‌ای|Soy kabab, pan-cooked|172|16|10|7.6|
کباب سویا فر|Soy kabab, oven-baked|151|16|10|5.2|
کباب سویا ایرفرایر|Soy kabab, air fryer|140|16|10|4|
کباب نخود زغالی|Chickpea kabab, charcoal|183|8|22|7|
کباب نخود تابه‌ای|Chickpea kabab, pan-cooked|197|8|22|8.6|
کباب نخود فر|Chickpea kabab, oven-baked|176|8|22|6.2|
کباب نخود ایرفرایر|Chickpea kabab, air fryer|165|8|22|5|
کباب تابه ای مرغ و قارچ زغالی|Chicken mushroom pan kabab, charcoal|159|20|4|7|
کباب تابه ای مرغ و قارچ تابه‌ای|Chicken mushroom pan kabab, pan-cooked|173|20|4|8.6|
کباب تابه ای مرغ و قارچ فر|Chicken mushroom pan kabab, oven-baked|152|20|4|6.2|
کباب تابه ای مرغ و قارچ ایرفرایر|Chicken mushroom pan kabab, air fryer|141|20|4|5|
کوکو سبزی فر‌پز|Kuku sabzi, oven-baked|120|8|5|7.5|کوکوی سبزی
کوکو سبزی کم‌روغن|Kuku sabzi, low-oil|133|8|5|9|کوکوی سبزی
کوکو سیب‌زمینی فر‌پز|Potato kuku, oven-baked|147|6|16|6.5|
کوکو سیب‌زمینی کم‌روغن|Potato kuku, low-oil|160|6|16|8|
کوکو بادمجان فر‌پز|Eggplant kuku, oven-baked|120|6|7|7.5|
کوکو بادمجان کم‌روغن|Eggplant kuku, low-oil|133|6|7|9|
کوکو کدو فر‌پز|Zucchini kuku, oven-baked|102|7|6|5.5|
کوکو کدو کم‌روغن|Zucchini kuku, low-oil|115|7|6|7|
کوکو قارچ فر‌پز|Mushroom kuku, oven-baked|107|8|4|6.5|
کوکو قارچ کم‌روغن|Mushroom kuku, low-oil|120|8|4|8|
کوکو مرغ فر‌پز|Chicken kuku, oven-baked|109|13|4|4.5|
کوکو مرغ کم‌روغن|Chicken kuku, low-oil|122|13|4|6|
کوکو لوبیا سبز فر‌پز|Green bean kuku, oven-baked|102|7|6|5.5|
کوکو لوبیا سبز کم‌روغن|Green bean kuku, low-oil|115|7|6|7|
کوکو کلم فر‌پز|Cabbage kuku, oven-baked|98|7|5|5.5|
کوکو کلم کم‌روغن|Cabbage kuku, low-oil|111|7|5|7|
کوکو گل‌کلم فر‌پز|Cauliflower kuku, oven-baked|102|8|5|5.5|
کوکو گل‌کلم کم‌روغن|Cauliflower kuku, low-oil|115|8|5|7|
کوکو هویج فر‌پز|Carrot kuku, oven-baked|110|7|8|5.5|
کوکو هویج کم‌روغن|Carrot kuku, low-oil|123|7|8|7|
کوکو اسفناج|Spinach kuku|138|9|3|10|
کوکو اسفناج فر‌پز|Spinach kuku, oven-baked|98|9|3|5.5|
کوکو اسفناج کم‌روغن|Spinach kuku, low-oil|111|9|3|7|
کوکو نخودفرنگی فر‌پز|Pea kuku, oven-baked|109|8|9|4.5|
کوکو نخودفرنگی کم‌روغن|Pea kuku, low-oil|122|8|9|6|
کوکو لوبیا چیتی|Pinto bean kuku|165|9|12|9|
کوکو لوبیا چیتی فر‌پز|Pinto bean kuku, oven-baked|125|9|12|4.5|
کوکو لوبیا چیتی کم‌روغن|Pinto bean kuku, low-oil|138|9|12|6|
کوکو عدس فر‌پز|Lentil kuku, oven-baked|120|10|12|3.5|
کوکو عدس کم‌روغن|Lentil kuku, low-oil|133|10|12|5|
کوکو ماهی|Fish kuku|140|14|3|8|
کوکو ماهی فر‌پز|Fish kuku, oven-baked|100|14|3|3.5|
کوکو ماهی کم‌روغن|Fish kuku, low-oil|113|14|3|5|
کوکو میگو|Shrimp kuku|136|13|3|8|
کوکو میگو فر‌پز|Shrimp kuku, oven-baked|96|13|3|3.5|
کوکو میگو کم‌روغن|Shrimp kuku, low-oil|109|13|3|5|
کوکو گوشت|Meat kuku|176|14|3|12|
کوکو گوشت فر‌پز|Meat kuku, oven-baked|136|14|3|7.5|
کوکو گوشت کم‌روغن|Meat kuku, low-oil|149|14|3|9|
کوکو سیب‌زمینی و پنیر|Potato cheese kuku|196|8|14|12|
کوکو سیب‌زمینی و پنیر فر‌پز|Potato cheese kuku, oven-baked|156|8|14|7.5|
کوکو سیب‌زمینی و پنیر کم‌روغن|Potato cheese kuku, low-oil|169|8|14|9|
کوکو نخود|Chickpea kuku|169|9|13|9|
کوکو نخود فر‌پز|Chickpea kuku, oven-baked|129|9|13|4.5|
کوکو نخود کم‌روغن|Chickpea kuku, low-oil|142|9|13|6|
کوکو گردو|Walnut kuku|201|9|3|17|
کوکو گردو فر‌پز|Walnut kuku, oven-baked|161|9|3|12.5|
کوکو گردو کم‌روغن|Walnut kuku, low-oil|174|9|3|14|
کوکو شوید|Dill kuku|147|8|4|11|
کوکو شوید فر‌پز|Dill kuku, oven-baked|107|8|4|6.5|
کوکو شوید کم‌روغن|Dill kuku, low-oil|120|8|4|8|
کوکو جعفری|Parsley kuku|147|8|4|11|
کوکو جعفری فر‌پز|Parsley kuku, oven-baked|107|8|4|6.5|
کوکو جعفری کم‌روغن|Parsley kuku, low-oil|120|8|4|8|
کوکو تره|Chives kuku|147|8|4|11|
کوکو تره فر‌پز|Chives kuku, oven-baked|107|8|4|6.5|
کوکو تره کم‌روغن|Chives kuku, low-oil|120|8|4|8|
کوکو کرفس|Celery kuku|147|8|4|11|
کوکو کرفس فر‌پز|Celery kuku, oven-baked|107|8|4|6.5|
کوکو کرفس کم‌روغن|Celery kuku, low-oil|120|8|4|8|
کوکو پیاز|Onion kuku|155|7|7|11|
کوکو پیاز فر‌پز|Onion kuku, oven-baked|115|7|7|6.5|
کوکو پیاز کم‌روغن|Onion kuku, low-oil|128|7|7|8|
کوکو بروکلی|Broccoli kuku|133|9|4|9|
کوکو بروکلی فر‌پز|Broccoli kuku, oven-baked|93|9|4|4.5|
کوکو بروکلی کم‌روغن|Broccoli kuku, low-oil|106|9|4|6|
کوکو زرشک|Zereshk kuku|155|8|6|11|
کوکو زرشک فر‌پز|Zereshk kuku, oven-baked|115|8|6|6.5|
کوکو زرشک کم‌روغن|Zereshk kuku, low-oil|128|8|6|8|
کوکو هویج و سیب‌زمینی|Carrot potato kuku|170|6|14|10|
کوکو هویج و سیب‌زمینی فر‌پز|Carrot potato kuku, oven-baked|130|6|14|5.5|
کوکو هویج و سیب‌زمینی کم‌روغن|Carrot potato kuku, low-oil|143|6|14|7|
کوکو مغز|Brain kuku|152|9|2|12|
کوکو مغز فر‌پز|Brain kuku, oven-baked|112|9|2|7.5|
کوکو مغز کم‌روغن|Brain kuku, low-oil|125|9|2|9|
کوکو اسفناج و پنیر|Spinach cheese kuku|160|10|3|12|
کوکو اسفناج و پنیر فر‌پز|Spinach cheese kuku, oven-baked|120|10|3|7.5|
کوکو اسفناج و پنیر کم‌روغن|Spinach cheese kuku, low-oil|133|10|3|9|
کتلت گوشت سرخ‌شده|Meat kotlet, pan-fried|217|12|13|13|
کتلت گوشت فر‌پز|Meat kotlet, oven-baked|181|12|13|9|
کتلت گوشت ایرفرایر|Meat kotlet, air fryer|168|12|13|7.5|
کتلت گوشت کم‌روغن|Meat kotlet, low-oil|195|12|13|10.5|
کتلت مرغ سرخ‌شده|Chicken kotlet, pan-fried|181|13|12|9|
کتلت مرغ فر‌پز|Chicken kotlet, oven-baked|145|13|12|5|
کتلت مرغ ایرفرایر|Chicken kotlet, air fryer|132|13|12|3.5|
کتلت مرغ کم‌روغن|Chicken kotlet, low-oil|159|13|12|6.5|
کتلت ماهی سرخ‌شده|Fish kotlet, pan-fried|177|12|12|9|
کتلت ماهی فر‌پز|Fish kotlet, oven-baked|141|12|12|5|
کتلت ماهی ایرفرایر|Fish kotlet, air fryer|128|12|12|3.5|
کتلت ماهی کم‌روغن|Fish kotlet, low-oil|155|12|12|6.5|
کتلت سیب‌زمینی سرخ‌شده|Potato kotlet, pan-fried|194|6|20|10|
کتلت سیب‌زمینی فر‌پز|Potato kotlet, oven-baked|158|6|20|6|
کتلت سیب‌زمینی ایرفرایر|Potato kotlet, air fryer|145|6|20|4.5|
کتلت سیب‌زمینی کم‌روغن|Potato kotlet, low-oil|172|6|20|7.5|
کتلت سبزیجات سرخ‌شده|Vegetable kotlet, pan-fried|156|5|16|8|
کتلت سبزیجات فر‌پز|Vegetable kotlet, oven-baked|120|5|16|4|
کتلت سبزیجات ایرفرایر|Vegetable kotlet, air fryer|107|5|16|2.5|
کتلت سبزیجات کم‌روغن|Vegetable kotlet, low-oil|134|5|16|5.5|
کتلت عدس سرخ‌شده|Lentil kotlet, pan-fried|184|8|20|8|
کتلت عدس فر‌پز|Lentil kotlet, oven-baked|148|8|20|4|
کتلت عدس ایرفرایر|Lentil kotlet, air fryer|135|8|20|2.5|
کتلت عدس کم‌روغن|Lentil kotlet, low-oil|162|8|20|5.5|
کتلت نخود سرخ‌شده|Chickpea kotlet, pan-fried|188|8|21|8|
کتلت نخود فر‌پز|Chickpea kotlet, oven-baked|152|8|21|4|
کتلت نخود ایرفرایر|Chickpea kotlet, air fryer|139|8|21|2.5|
کتلت نخود کم‌روغن|Chickpea kotlet, low-oil|166|8|21|5.5|
کتلت قارچ سرخ‌شده|Mushroom kotlet, pan-fried|148|6|13|8|
کتلت قارچ فر‌پز|Mushroom kotlet, oven-baked|112|6|13|4|
کتلت قارچ ایرفرایر|Mushroom kotlet, air fryer|99|6|13|2.5|
کتلت قارچ کم‌روغن|Mushroom kotlet, low-oil|126|6|13|5.5|
کتلت کدو سرخ‌شده|Zucchini kotlet, pan-fried|152|6|14|8|
کتلت کدو فر‌پز|Zucchini kotlet, oven-baked|116|6|14|4|
کتلت کدو ایرفرایر|Zucchini kotlet, air fryer|103|6|14|2.5|
کتلت کدو کم‌روغن|Zucchini kotlet, low-oil|130|6|14|5.5|
کتلت بادمجان سرخ‌شده|Eggplant kotlet, pan-fried|161|6|14|9|
کتلت بادمجان فر‌پز|Eggplant kotlet, oven-baked|125|6|14|5|
کتلت بادمجان ایرفرایر|Eggplant kotlet, air fryer|112|6|14|3.5|
کتلت بادمجان کم‌روغن|Eggplant kotlet, low-oil|139|6|14|6.5|
کتلت میگو سرخ‌شده|Shrimp kotlet, pan-fried|168|12|12|8|
کتلت میگو فر‌پز|Shrimp kotlet, oven-baked|132|12|12|4|
کتلت میگو ایرفرایر|Shrimp kotlet, air fryer|119|12|12|2.5|
کتلت میگو کم‌روغن|Shrimp kotlet, low-oil|146|12|12|5.5|
کتلت بلغور سرخ‌شده|Bulgur kotlet, pan-fried|180|9|18|8|
کتلت بلغور فر‌پز|Bulgur kotlet, oven-baked|144|9|18|4|
کتلت بلغور ایرفرایر|Bulgur kotlet, air fryer|131|9|18|2.5|
کتلت بلغور کم‌روغن|Bulgur kotlet, low-oil|158|9|18|5.5|
کتلت سویا سرخ‌شده|Soy kotlet, pan-fried|184|12|16|8|
کتلت سویا فر‌پز|Soy kotlet, oven-baked|148|12|16|4|
کتلت سویا ایرفرایر|Soy kotlet, air fryer|135|12|16|2.5|
کتلت سویا کم‌روغن|Soy kotlet, low-oil|162|12|16|5.5|
کتلت گوشت و سیب‌زمینی سرخ‌شده|Meat potato kotlet, pan-fried|207|11|16|11|
کتلت گوشت و سیب‌زمینی فر‌پز|Meat potato kotlet, oven-baked|171|11|16|7|
کتلت گوشت و سیب‌زمینی ایرفرایر|Meat potato kotlet, air fryer|158|11|16|5.5|
کتلت گوشت و سیب‌زمینی کم‌روغن|Meat potato kotlet, low-oil|185|11|16|8.5|
کتلت گوشت و قارچ سرخ‌شده|Meat mushroom kotlet, pan-fried|191|12|11|11|
کتلت گوشت و قارچ فر‌پز|Meat mushroom kotlet, oven-baked|155|12|11|7|
کتلت گوشت و قارچ ایرفرایر|Meat mushroom kotlet, air fryer|142|12|11|5.5|
کتلت گوشت و قارچ کم‌روغن|Meat mushroom kotlet, low-oil|169|12|11|8.5|
کتلت بوقلمون سرخ‌شده|Turkey kotlet, pan-fried|176|14|12|8|
کتلت بوقلمون فر‌پز|Turkey kotlet, oven-baked|140|14|12|4|
کتلت بوقلمون ایرفرایر|Turkey kotlet, air fryer|127|14|12|2.5|
کتلت بوقلمون کم‌روغن|Turkey kotlet, low-oil|154|14|12|5.5|
کتلت لوبیا سرخ‌شده|Bean kotlet, pan-fried|175|8|20|7|
کتلت لوبیا فر‌پز|Bean kotlet, oven-baked|139|8|20|3|
کتلت لوبیا ایرفرایر|Bean kotlet, air fryer|126|8|20|1.5|
کتلت لوبیا کم‌روغن|Bean kotlet, low-oil|153|8|20|4.5|
کتلت هویج سرخ‌شده|Carrot kotlet, pan-fried|156|6|15|8|
کتلت هویج فر‌پز|Carrot kotlet, oven-baked|120|6|15|4|
کتلت هویج ایرفرایر|Carrot kotlet, air fryer|107|6|15|2.5|
کتلت هویج کم‌روغن|Carrot kotlet, low-oil|134|6|15|5.5|
کتلت کلم سرخ‌شده|Cabbage kotlet, pan-fried|152|6|14|8|
کتلت کلم فر‌پز|Cabbage kotlet, oven-baked|116|6|14|4|
کتلت کلم ایرفرایر|Cabbage kotlet, air fryer|103|6|14|2.5|
کتلت کلم کم‌روغن|Cabbage kotlet, low-oil|130|6|14|5.5|
کتلت تن‌ماهی سرخ‌شده|Tuna kotlet, pan-fried|168|13|11|8|
کتلت تن‌ماهی فر‌پز|Tuna kotlet, oven-baked|132|13|11|4|
کتلت تن‌ماهی ایرفرایر|Tuna kotlet, air fryer|119|13|11|2.5|
کتلت تن‌ماهی کم‌روغن|Tuna kotlet, low-oil|146|13|11|5.5|
کوفته تبریزی کم‌روغن|Kufteh Tabrizi, low-oil|143|9|12|6.5|
کوفته برنجی کم‌روغن|Kufteh berenji, low-oil|134|8|13|5.5|
کوفته نخودچی|Kufteh nokhodchi|165|9|12|9|
کوفته نخودچی کم‌روغن|Kufteh nokhodchi, low-oil|143|9|12|6.5|
کوفته سبزی کم‌روغن|Herb kufteh, low-oil|112|7|13|3.5|
کوفته شیرازی کم‌روغن|Shirazi kufteh, low-oil|122|8|10|5.5|
کوفته ریزه کم‌روغن|Kufteh rizeh, low-oil|135|9|10|6.5|
کوفته قلقلی کم‌روغن|Ghelgheli kufteh, low-oil|132|10|6|7.5|
کوفته غلغلی|Gholgholi kufteh|146|9|5|10|
کوفته غلغلی کم‌روغن|Gholgholi kufteh, low-oil|124|9|5|7.5|
کوفته کردی|Kurdish kufteh|156|9|12|8|
کوفته کردی کم‌روغن|Kurdish kufteh, low-oil|134|9|12|5.5|
کوفته ارومیه‌ای|Urmia kufteh|165|9|12|9|
کوفته ارومیه‌ای کم‌روغن|Urmia kufteh, low-oil|143|9|12|6.5|
کوفته انار|Pomegranate kufteh|148|8|11|8|
کوفته انار کم‌روغن|Pomegranate kufteh, low-oil|126|8|11|5.5|
کوفته کدو|Zucchini kufteh|131|7|10|7|
کوفته کدو کم‌روغن|Zucchini kufteh, low-oil|109|7|10|4.5|
کوفته بادمجان|Eggplant kufteh|136|7|9|8|
کوفته بادمجان کم‌روغن|Eggplant kufteh, low-oil|114|7|9|5.5|
کوفته گیاهی|Vegetarian kufteh|137|5|18|5|
کوفته گیاهی کم‌روغن|Vegetarian kufteh, low-oil|115|5|18|2.5|
کوفته سیب‌زمینی|Potato kufteh|142|6|16|6|
کوفته سیب‌زمینی کم‌روغن|Potato kufteh, low-oil|120|6|16|3.5|
کوفته مرغ کم‌روغن|Chicken kufteh, low-oil|121|11|9|4.5|
کوفته بلغور|Bulgur kufteh|155|8|15|7|
کوفته بلغور کم‌روغن|Bulgur kufteh, low-oil|133|8|15|4.5|
کوفته ماهی کم‌روغن|Fish kufteh, low-oil|112|10|10|3.5|
کوفته لپه|Split pea kufteh|159|9|15|7|
کوفته لپه کم‌روغن|Split pea kufteh, low-oil|137|9|15|4.5|
کوفته تره|Tareh kufteh|126|7|11|6|
کوفته تره کم‌روغن|Tareh kufteh, low-oil|104|7|11|3.5|
دلمه برگ مو کم‌روغن|Dolmeh grape leaf, low-oil|116|5|16|3.5|
دلمه برگ مو با مرغ چرخ‌کرده|Dolmeh grape leaf, with ground chicken|129|6|15|5|
دلمه فلفل|Stuffed bell pepper|118|6|10|6|
دلمه فلفل کم‌روغن|Stuffed bell pepper, low-oil|96|6|10|3.5|
دلمه فلفل با مرغ چرخ‌کرده|Stuffed bell pepper, with ground chicken|109|7|9|5|
دلمه بادمجان کم‌روغن|Stuffed eggplant, low-oil|101|6|9|4.5|
دلمه بادمجان با مرغ چرخ‌کرده|Stuffed eggplant, with ground chicken|114|7|8|6|
دلمه کدو کم‌روغن|Stuffed zucchini, low-oil|92|6|9|3.5|
دلمه کدو با مرغ چرخ‌کرده|Stuffed zucchini, with ground chicken|105|7|8|5|
دلمه گوجه کم‌روغن|Stuffed tomato, low-oil|92|6|9|3.5|
دلمه گوجه با مرغ چرخ‌کرده|Stuffed tomato, with ground chicken|105|7|8|5|
دلمه کلم کم‌روغن|Stuffed cabbage, low-oil|87|6|10|2.5|کلم‌پیچ;کلم پیچ
دلمه کلم با مرغ چرخ‌کرده|Stuffed cabbage, with ground chicken|100|7|9|4|کلم‌پیچ;کلم پیچ
دلمه سیب کم‌روغن|Stuffed apple, low-oil|108|5|14|3.5|
دلمه سیب با مرغ چرخ‌کرده|Stuffed apple, with ground chicken|121|6|13|5|
دلمه به کم‌روغن|Stuffed quince, low-oil|108|5|14|3.5|
دلمه به با مرغ چرخ‌کرده|Stuffed quince, with ground chicken|121|6|13|5|
دلمه سیب‌زمینی کم‌روغن|Stuffed potato, low-oil|112|6|14|3.5|
دلمه سیب‌زمینی با مرغ چرخ‌کرده|Stuffed potato, with ground chicken|125|7|13|5|
دلمه پیاز|Stuffed onion|118|6|10|6|
دلمه پیاز کم‌روغن|Stuffed onion, low-oil|96|6|10|3.5|
دلمه پیاز با مرغ چرخ‌کرده|Stuffed onion, with ground chicken|109|7|9|5|
دلمه کرفس|Stuffed celery|101|5|9|5|
دلمه کرفس کم‌روغن|Stuffed celery, low-oil|79|5|9|2.5|
دلمه کرفس با مرغ چرخ‌کرده|Stuffed celery, with ground chicken|92|6|8|4|
دلمه بادمجان و فلفل|Eggplant pepper dolmeh|118|6|10|6|
دلمه بادمجان و فلفل کم‌روغن|Eggplant pepper dolmeh, low-oil|96|6|10|3.5|
دلمه بادمجان و فلفل با مرغ چرخ‌کرده|Eggplant pepper dolmeh, with ground chicken|109|7|9|5|
دلمه برگ کلم کم‌روغن|Cabbage leaf dolmeh, low-oil|91|6|11|2.5|
دلمه برگ کلم با مرغ چرخ‌کرده|Cabbage leaf dolmeh, with ground chicken|104|7|10|4|
دلمه برگ چغندر|Beet leaf dolmeh|117|5|13|5|
دلمه برگ چغندر کم‌روغن|Beet leaf dolmeh, low-oil|95|5|13|2.5|
دلمه برگ چغندر با مرغ چرخ‌کرده|Beet leaf dolmeh, with ground chicken|108|6|12|4|
دلمه برگ مو بدون گوشت کم‌روغن|Vegetarian grape leaf dolmeh, low-oil|129|3|19|4.5|یالانچی
دلمه برگ مو بدون گوشت با مرغ چرخ‌کرده|Vegetarian grape leaf dolmeh, with ground chicken|142|4|18|6|یالانچی
دلمه هویج|Stuffed carrot|113|5|12|5|
دلمه هویج کم‌روغن|Stuffed carrot, low-oil|91|5|12|2.5|
دلمه هویج با مرغ چرخ‌کرده|Stuffed carrot, with ground chicken|104|6|11|4|
دلمه سیر|Stuffed garlic|117|5|13|5|
دلمه سیر کم‌روغن|Stuffed garlic, low-oil|95|5|13|2.5|
دلمه سیر با مرغ چرخ‌کرده|Stuffed garlic, with ground chicken|108|6|12|4|
دلمه آلو|Stuffed plum|125|5|15|5|
دلمه آلو کم‌روغن|Stuffed plum, low-oil|103|5|15|2.5|
دلمه آلو با مرغ چرخ‌کرده|Stuffed plum, with ground chicken|116|6|14|4|
دلمه لوبیا سبز|Stuffed green bean|109|5|11|5|
دلمه لوبیا سبز کم‌روغن|Stuffed green bean, low-oil|87|5|11|2.5|
دلمه لوبیا سبز با مرغ چرخ‌کرده|Stuffed green bean, with ground chicken|100|6|10|4|
دلمه قارچ|Stuffed mushroom|119|7|7|7|
دلمه قارچ کم‌روغن|Stuffed mushroom, low-oil|97|7|7|4.5|
دلمه قارچ با مرغ چرخ‌کرده|Stuffed mushroom, with ground chicken|110|8|6|6|
دلمه زردآلو|Stuffed apricot|125|5|15|5|
دلمه زردآلو کم‌روغن|Stuffed apricot, low-oil|103|5|15|2.5|
دلمه زردآلو با مرغ چرخ‌کرده|Stuffed apricot, with ground chicken|116|6|14|4|
دلمه کدو حلوایی|Stuffed pumpkin|126|6|12|6|
دلمه کدو حلوایی کم‌روغن|Stuffed pumpkin, low-oil|104|6|12|3.5|
دلمه کدو حلوایی با مرغ چرخ‌کرده|Stuffed pumpkin, with ground chicken|117|7|11|5|
دلمه کنگر|Stuffed artichoke|109|6|10|5|
دلمه کنگر کم‌روغن|Stuffed artichoke, low-oil|87|6|10|2.5|
دلمه کنگر با مرغ چرخ‌کرده|Stuffed artichoke, with ground chicken|100|7|9|4|
دلمه انار|Stuffed pomegranate dolmeh|130|5|14|6|
دلمه انار کم‌روغن|Stuffed pomegranate dolmeh, low-oil|108|5|14|3.5|
دلمه انار با مرغ چرخ‌کرده|Stuffed pomegranate dolmeh, with ground chicken|121|6|13|5|
شله زرد کم‌شکر|Low-sugar sholeh zard|139|1.2|28|2.5|
شله زرد با گلاب|Sholeh zard with rose water|172|1.2|35|3|
شله زرد با روغن حیوانی|Sholeh zard with ghee|195|1.2|34|6|
شله زرد مشهدی|Mashhadi sholeh zard|189|1.3|38|3.5|
شله زرد با بادام|Sholeh zard with almond|185|2|34|4.5|
شله زرد نذری با شکر زیاد|Sweet nazri sholeh zard|195|1|42|2.5|
شله قلمکار|Sholeh ghalamkar|120|5|16|4|شله‌قلمکار
شله قلمکار نذری|Nazri sholeh ghalamkar|112|5|15|3.5|
شله نذری با گوشت|Nazri sholeh with meat|116|6|14|4|
شله ماش|Sholeh mash|99|5|14|2.5|
شله لپه|Sholeh lapeh|107|5|15|3|
شله خمیر|Sholeh khamir|126|2|25|2|
حلوا خرما|Date halva|324|4|50|12|
حلوا زرد|Yellow halva|306|3|42|14|
حلوا نذری|Nazri halva|323|3|44|15|
حلوا کم‌شکر|Low-sugar halva|252|4|32|12|
حلوا برنج|Rice halva|322|3|46|14|
حلوا آرد برنج|Rice flour halva|314|3|44|14|
حلوا سیب‌زمینی|Potato halva|297|3|42|13|
حلوا گردو و کنجد|Walnut sesame halva|418|8|38|26|
حلوا عسلی|Honey halva|322|3|46|14|
حلوا پنجه‌ای|Panjei halva|322|4|45|14|
حلوا خرمایی|Khormaei halva|332|4|52|12|
حلوا نان|Bread halva|326|4|46|14|
حلوا پوست‌موز|Banana halva|280|3|40|12|
حلوا دارچین|Cinnamon halva|314|3|44|14|
حلوا زعفرانی|Saffron halva|314|3|44|14|
حلوا پسته|Pistachio halva|394|7|42|22|
حلوا سمنو|Samanu halva|282|3|45|10|
حلوا حاج بادام|Haj badam halva|344|5|45|16|
سمنو کم‌شکر|Low-sugar samanu|123|3|22|2.5|
سمنو با روغن|Samanu with oil|165|3|27|5|
سمنو خانگی|Homemade samanu|150|3|29|2.4|
سمنو با شیره انگور|Samanu with grape molasses|171|3|34|2.5|
سمنو با شکر|Samanu with sugar|163|3|32|2.5|
عدسی نذری|Adasi nazri|112|5|14|4|عدسی
عدسی با پیاز داغ|Adasi with fried onion|123|5.5|14|5|
عدسی کم‌روغن|Low-oil adasi|100|5.5|15|2|
عدسی با نان|Adasi with bread|148|6|22|4|
عدسی با گوشت|Adasi with meat|125|8|12|5|
عدسی با سیب‌زمینی|Adasi with potato|124|5|18|3.5|
عدسی با ماست|Adasi with yogurt|120|6|15|4|
عدسی سبزی|Adasi with herbs|106|5.5|13|3.5|
عدس‌پلو نذری|Adas polo nazri|155|3.8|27|3.5|
آش نذری|Ash nazri|83|4|10|3|
آش رشته نذری|Nazri ash reshteh|81|4|10|2.8|
حلیم نذری|Nazri haleem|120|7|14|4|
زرده‌پلو نذری|Nazri zarde polo|182|2.5|34|4|زرده پلو
قیمه نذری|Nazri gheymeh|118|6|10|6|
پلو نذری|Nazri polo|152|3|27|3.5|
خورش قیمه نذری|Nazri gheymeh stew|118|6|10|6|
ماش پلو نذری|Nazri mash polo|149|4|26|3.2|
شیربرنج نذری|Nazri rice pudding|119|3|20|3|
شیر برنج کم‌شکر|Low-sugar rice pudding|99|3|15|3|
رشته پلو نذری|Nazri reshteh polo|168|3|31|3.6|
نان نذری|Nazri bread|254|9|50|2|
خرما نذری|Nazri dates|310|2|75|0.2|
زولبیا نذری|Nazri zoolbia|410|2|60|18|
بامیه نذری|Nazri bamieh|370|2|50|18|
کیک نذری|Nazri cake|382|5|50|18|
شربت نذری|Nazri sharbat|81|0|20|0.1|
شیر نذری گرم|Nazri hot milk|59|3|5|3|
چای نذری|Nazri tea|21|0|5|0.1|
خرمای نذری با گردو|Nazri date with walnut|346|4|60|10|
هریسه|Harisa|134|6|14|6|
هریسه مرغ|Chicken harisa|133|8|14|5|
کله‌قند نذری|Nazri sugar cube|401|0|100|0.1|
نخودچی نذری|Nazri nokhodchi|370|10|60|10|
نان برنجی نذری|Nan berenji nazri|432|5|58|20|
نان نخودچی نذری|Nan nokhodchi nazri|436|6|58|20|
قرص نذری|Ghors nazri|389|0|95|1|
بستنی نذری|Nazri ice cream|202|3|25|10|
آب میوه نذری|Nazri juice|51|0.5|12|0.1|
دوغ نذری|Nazri doogh|34|2|3|1.5|
مربا نذری|Nazri jam|262|0.3|65|0.1|
کره و عسل نذری|Nazri butter honey|472|0.5|50|30|
ماست نذری|Nazri yogurt|59|3.5|4.5|3|
میرزا قاسمی گیلانی|Gilan mirza ghasemi|103|4|6|7|
میرزا قاسمی گیلانی کم‌روغن|Gilan mirza ghasemi, low-oil|85|4|6|5|
باقلا قاتوق کم‌روغن|Baghala ghatogh, low-oil|100|6|10|4|باقالا قاتوق
ترش تره|Torsh tareh|81|3|6|5|
ترش تره کم‌روغن|Torsh tareh, low-oil|63|3|6|3|
اناربیج|Anarbij|131|5|12|7|
اناربیج کم‌روغن|Anarbij, low-oil|113|5|12|5|
کباب ترش مازندرانی|Mazandarani torsh kabab|194|20|6|10|
کباب ترش مازندرانی کم‌روغن|Mazandarani torsh kabab, low-oil|176|20|6|8|
مرغ ترش کم‌روغن|Morgh torsh, low-oil|113|11|6|5|
ماهی شکم‌پر شمالی|Northern stuffed fish|160|17|5|8|
ماهی شکم‌پر شمالی کم‌روغن|Northern stuffed fish, low-oil|142|17|5|6|
سیر قلیه|Sir ghalieh|98|5|6|6|
سیر قلیه کم‌روغن|Sir ghalieh, low-oil|80|5|6|4|
خورش کدو شمالی|Northern squash stew|85|3|7|5|
خورش کدو شمالی کم‌روغن|Northern squash stew, low-oil|67|3|7|3|
کوکو سبزی گیلانی|Gilan kuku sabzi|160|8|5|12|
کوکو سبزی گیلانی کم‌روغن|Gilan kuku sabzi, low-oil|142|8|5|10|
ترشی تره گیلانی|Gilan torshi tareh|68|2|6|4|
ترشی تره گیلانی کم‌روغن|Gilan torshi tareh, low-oil|50|2|6|2|
زیتون پرورده کم‌روغن|Zeytoon parvardeh, low-oil|214|2|20|14|زیتون‌پرورده
خورش فسنجان گیلانی|Gilan fesenjan|171|8|10|11|
خورش فسنجان گیلانی کم‌روغن|Gilan fesenjan, low-oil|153|8|10|9|
ماهی قزل‌آلای سرخ شده|Fried trout|190|22|3|10|
ماهی قزل‌آلای سرخ شده کم‌روغن|Fried trout, low-oil|172|22|3|8|
کباب ماهی سفید|Grilled white fish|133|22|0|5|
کباب ماهی سفید کم‌روغن|Grilled white fish, low-oil|115|22|0|3|
ماهی دودی شمالی|Smoked northern fish|177|24|0|9|
ماهی دودی شمالی کم‌روغن|Smoked northern fish, low-oil|159|24|0|7|
واویشکا|Vavishka|102|4|8|6|
واویشکا کم‌روغن|Vavishka, low-oil|84|4|8|4|
نرگسی اسفناج کم‌روغن|Nargesi spinach, low-oil|98|8|3|6|نرگسی
کال کباب|Kal kabab|81|3|6|5|
کال کباب کم‌روغن|Kal kabab, low-oil|63|3|6|3|
شامی رشتی کم‌روغن|Shami Rashti, low-oil|156|14|7|8|
لاشه‌ماهی|Lasheh mahi|151|20|2|7|
لاشه‌ماهی کم‌روغن|Lasheh mahi, low-oil|133|20|2|5|
کته ماهی|Kateh mahi|144|9|18|4|
کته ماهی کم‌روغن|Kateh mahi, low-oil|126|9|18|2|
ماهی سفید با سبزی|White fish with herbs|138|18|3|6|
ماهی سفید با سبزی کم‌روغن|White fish with herbs, low-oil|120|18|3|4|
ماهی ترش شمال|Torsh fish|152|16|4|8|
ماهی ترش شمال کم‌روغن|Torsh fish, low-oil|134|16|4|6|
ماهی با ریحون|Fish with basil|143|17|3|7|
ماهی با ریحون کم‌روغن|Fish with basil, low-oil|125|17|3|5|
شیر برنج مازندرانی|Mazandarani rice pudding|127|3|22|3|
شیر برنج مازندرانی کم‌روغن|Mazandarani rice pudding, low-oil|109|3|22|1|
مرغ مسما|Morgh mosama|139|11|8|7|
مرغ مسما کم‌روغن|Morgh mosama, low-oil|121|11|8|5|
بادمجان شکم‌پر شمالی|Northern stuffed eggplant|123|6|9|7|
بادمجان شکم‌پر شمالی کم‌روغن|Northern stuffed eggplant, low-oil|105|6|9|5|
اشکنه گیلانی|Gilan eshkeneh|111|6|6|7|
اشکنه گیلانی کم‌روغن|Gilan eshkeneh, low-oil|93|6|6|5|
کوکو مرغ مازندرانی|Mazandarani chicken kuku|149|13|4|9|
کوکو مرغ مازندرانی کم‌روغن|Mazandarani chicken kuku, low-oil|131|13|4|7|
تره کباب|Tareh kabab|146|9|5|10|
تره کباب کم‌روغن|Tareh kabab, low-oil|128|9|5|8|
کوفته مازندرانی|Mazandarani kufteh|161|9|11|9|
کوفته مازندرانی کم‌روغن|Mazandarani kufteh, low-oil|143|9|11|7|
ماهی مسما|Mahi mosama|152|14|6|8|
ماهی مسما کم‌روغن|Mahi mosama, low-oil|134|14|6|6|
دوغ سیر|Doogh sir|38|2|3|2|
دوغ سیر کم‌روغن|Doogh sir, low-oil|21|2|3|0.1|
ترشی انبه گیلانی|Gilan mango pickle|133|1|12|9|
ترشی انبه گیلانی کم‌روغن|Gilan mango pickle, low-oil|115|1|12|7|
ریحون پلو|Reyhoon polo|148|3|26|3.6|
ریحون پلو کم‌روغن|Reyhoon polo, low-oil|130|3|26|1.6|
برنج کته با ماهی|Kateh with fish|173|10|22|5|
برنج کته با ماهی کم‌روغن|Kateh with fish, low-oil|155|10|22|3|
بوراک مازندرانی|Mazandarani burak|244|8|26|12|
بوراک مازندرانی کم‌روغن|Mazandarani burak, low-oil|226|8|26|10|
آش کدو مازندرانی|Mazandarani kadoo ash|61|2.2|8|2.2|
آش کدو مازندرانی کم‌روغن|Mazandarani kadoo ash, low-oil|43|2.2|8|0.2|
خورش انار گیلانی|Gilan anar stew|149|6|11|9|
خورش انار گیلانی کم‌روغن|Gilan anar stew, low-oil|131|6|11|7|
قیمه نثار تبریزی|Tabrizi gheymeh nesar|184|8|11|12|
قیمه نثار تبریزی کم‌روغن|Tabrizi gheymeh nesar, low-oil|166|8|11|10|
آش آلو تبریزی|Tabrizi aloo ash|75|2.4|11|2.4|
آش آلو تبریزی کم‌روغن|Tabrizi aloo ash, low-oil|57|2.4|11|0.4|
دلمه پاپریکا|Paprika dolmeh|118|6|10|6|
دلمه پاپریکا کم‌روغن|Paprika dolmeh, low-oil|100|6|10|4|
قورمه اردبیلی|Ardabil ghorme|162|10|8|10|
قورمه اردبیلی کم‌روغن|Ardabil ghorme, low-oil|144|10|8|8|
خورش ترشی اردبیل|Ardabil sour stew|157|9|10|9|
خورش ترشی اردبیل کم‌روغن|Ardabil sour stew, low-oil|139|9|10|7|
حلیم بادمجان کم‌روغن|Halim bademjan, low-oil|81|3|6|5|
دوغ پلو|Doogh polo|136|4|22|3.5|
دوغ پلو کم‌روغن|Doogh polo, low-oil|118|4|22|1.5|
یارما|Yarma|100|5|12|3.5|
یارما کم‌روغن|Yarma, low-oil|82|5|12|1.5|
بوزباش|Buzbash|136|8|8|8|
بوزباش کم‌روغن|Buzbash, low-oil|118|8|8|6|
قیزلار‌خورش|Ghizlar khoresh|153|8|10|9|
قیزلار‌خورش کم‌روغن|Ghizlar khoresh, low-oil|135|8|10|7|
دیزی سنگی تبریز|Tabriz dizi|126|8|10|6|
دیزی سنگی تبریز کم‌روغن|Tabriz dizi, low-oil|108|8|10|4|
قره‌ایزی|Qara iz|92|3|12|3.5|
قره‌ایزی کم‌روغن|Qara iz, low-oil|74|3|12|1.5|
اوماج آذربایجان|Azerbaijani omaj|77|2.8|12|2|
اوماج آذربایجان کم‌روغن|Azerbaijani omaj, low-oil|60|2.8|12|0.1|
ناناز تبریزی|Nanaz Tabrizi|80|3|8|4|
ناناز تبریزی کم‌روغن|Nanaz Tabrizi, low-oil|62|3|8|2|
کوکو آذری|Azeri kuku|155|8|6|11|
کوکو آذری کم‌روغن|Azeri kuku, low-oil|137|8|6|9|
اودیسا|Odisa|101|4|10|5|
اودیسا کم‌روغن|Odisa, low-oil|83|4|10|3|
قاتیق‌دوغا|Gatigh doga|66|3|8|2.4|
قاتیق‌دوغا کم‌روغن|Gatigh doga, low-oil|48|3|8|0.4|
دوشاب‌پلو|Doshab polo|172|3|32|3.6|
دوشاب‌پلو کم‌روغن|Doshab polo, low-oil|154|3|32|1.6|
یمیش|Yamish|126|6|12|6|
یمیش کم‌روغن|Yamish, low-oil|108|6|12|4|
خاگینه ارومیه‌ای|Urmia khagineh|134|6|5|10|
خاگینه ارومیه‌ای کم‌روغن|Urmia khagineh, low-oil|116|6|5|8|
بوغاما|Boghama|134|6|5|10|
بوغاما کم‌روغن|Boghama, low-oil|116|6|5|8|
ترخینه|Tarkhineh|85|3.4|12|2.6|
ترخینه کم‌روغن|Tarkhineh, low-oil|67|3.4|12|0.6|
خورش بادمجان تبریزی|Tabrizi eggplant stew|124|7|6|8|
خورش بادمجان تبریزی کم‌روغن|Tabrizi eggplant stew, low-oil|106|7|6|6|
کباب تبریزی با سبزی|Tabriz kabab with herbs|214|20|2|14|
کباب تبریزی با سبزی کم‌روغن|Tabriz kabab with herbs, low-oil|196|20|2|12|
شیخ‌المحشی|Sheikh al-mahshi|114|6|9|6|
شیخ‌المحشی کم‌روغن|Sheikh al-mahshi, low-oil|96|6|9|4|
دوینه کردی|Kurdish duine|144|6|12|8|
دوینه کردی کم‌روغن|Kurdish duine, low-oil|126|6|12|6|
کلانه|Kalaneh|119|6|8|7|
کلانه کم‌روغن|Kalaneh, low-oil|101|6|8|5|
کله‌جوش کم‌روغن|Kalleh jush, low-oil|54|3|6|2|کله جوش
آش گندم کردی|Kurdish gandom ash|74|3|11|2|
آش گندم کردی کم‌روغن|Kurdish gandom ash, low-oil|57|3|11|0.1|
پلو کردی|Kurdish polo|156|4|26|4|
پلو کردی کم‌روغن|Kurdish polo, low-oil|138|4|26|2|
سیرابی کردی|Kurdish sirabi|102|10|2|6|
سیرابی کردی کم‌روغن|Kurdish sirabi, low-oil|84|10|2|4|
نان دوغ کردی|Kurdish doogh bread|207|7|38|3|
نان دوغ کردی کم‌روغن|Kurdish doogh bread, low-oil|189|7|38|1|
ماست کردی|Kurdish yogurt|59|3.5|4.5|3|
ماست کردی کم‌روغن|Kurdish yogurt, low-oil|41|3.5|4.5|1|
کباب کوبیده کردستان|Kurdistan koobideh|219|20|1|15|
کباب کوبیده کردستان کم‌روغن|Kurdistan koobideh, low-oil|201|20|1|13|
کباب مارتیکی|Marticki kabab|200|22|1|12|
کباب مارتیکی کم‌روغن|Marticki kabab, low-oil|182|22|1|10|
بیسکویت کردی|Kurdish biscuit|372|6|60|12|
بیسکویت کردی کم‌روغن|Kurdish biscuit, low-oil|354|6|60|10|
پیتا کردی|Kurdish pita|255|7|50|3|
پیتا کردی کم‌روغن|Kurdish pita, low-oil|237|7|50|1|
دلمه کردی|Kurdish dolmeh|130|5|14|6|
دلمه کردی کم‌روغن|Kurdish dolmeh, low-oil|112|5|14|4|
هلو‌پیچ|Halu pich|184|6|22|8|
هلو‌پیچ کم‌روغن|Halu pich, low-oil|166|6|22|6|
خورش ماست سنندج|Sanandaj yogurt stew|124|7|6|8|
خورش ماست سنندج کم‌روغن|Sanandaj yogurt stew, low-oil|106|7|6|6|
قلیه ماهی کم‌روغن|Ghalieh mahi, low-oil|92|10|4|4|
قلیه میگو کم‌روغن|Ghalieh meygoo, low-oil|100|11|5|4|
ماهی سرخ‌شده جنوب|Southern fried fish|186|20|4|10|
ماهی سرخ‌شده جنوب کم‌روغن|Southern fried fish, low-oil|168|20|4|8|
مسقطی|Masghati|290|2|48|10|
مسقطی کم‌روغن|Masghati, low-oil|272|2|48|8|
خورش مرغ جنوب|Southern chicken stew|140|11|6|8|
خورش مرغ جنوب کم‌روغن|Southern chicken stew, low-oil|122|11|6|6|
بریانی خوزستان|Khuzestan beryani|264|17|22|12|
بریانی خوزستان کم‌روغن|Khuzestan beryani, low-oil|246|17|22|10|
کباب تابه‌ای اهوازی|Ahvazi pan kabab|228|19|2|16|
کباب تابه‌ای اهوازی کم‌روغن|Ahvazi pan kabab, low-oil|210|19|2|14|
خورش ماهی جنوبی|Southern fish stew|118|11|5|6|
خورش ماهی جنوبی کم‌روغن|Southern fish stew, low-oil|100|11|5|4|
ماهی تنوری|Tanoori fish|164|20|3|8|
ماهی تنوری کم‌روغن|Tanoori fish, low-oil|146|20|3|6|
مهیاوه|Mahyaveh|125|16|4|5|
مهیاوه کم‌روغن|Mahyaveh, low-oil|107|16|4|3|
سنبوسه جنوبی|Southern sambosa|244|8|26|12|
سنبوسه جنوبی کم‌روغن|Southern sambosa, low-oil|226|8|26|10|
سمبوسه گوشت|Meat sambosa|253|9|25|13|
سمبوسه گوشت کم‌روغن|Meat sambosa, low-oil|235|9|25|11|
سمبوسه سبزیجات|Vegetable sambosa|240|5|28|12|
سمبوسه سبزیجات کم‌روغن|Vegetable sambosa, low-oil|222|5|28|10|
سمبوسه مرغ|Chicken sambosa|243|10|26|11|
سمبوسه مرغ کم‌روغن|Chicken sambosa, low-oil|225|10|26|9|
باقلا‌ی بوشهری|Bushehri baghala|126|6|12|6|
باقلا‌ی بوشهری کم‌روغن|Bushehri baghala, low-oil|108|6|12|4|
مرغ بریان|Beryan chicken|178|20|2|10|
مرغ بریان کم‌روغن|Beryan chicken, low-oil|160|20|2|8|
حلوای ارده بوشهری|Bushehr halva ardeh|432|8|55|20|
حلوای ارده بوشهری کم‌روغن|Bushehr halva ardeh, low-oil|414|8|55|18|
میگو پلو بوشهری|Bushehri meygoo polo|164|6|26|4|
میگو پلو بوشهری کم‌روغن|Bushehri meygoo polo, low-oil|146|6|26|2|
مویه|Mooyeh|101|10|4|5|
مویه کم‌روغن|Mooyeh, low-oil|83|10|4|3|
اوزی|Ozi|240|11|22|12|
اوزی کم‌روغن|Ozi, low-oil|222|11|22|10|
سالونه ماهی|Salooneh mahi|126|13|5|6|
سالونه ماهی کم‌روغن|Salooneh mahi, low-oil|108|13|5|4|
سالونه مرغ|Salooneh chicken|143|14|6|7|
سالونه مرغ کم‌روغن|Salooneh chicken, low-oil|125|14|6|5|
سالونه گوشت|Salooneh meat|157|13|6|9|
سالونه گوشت کم‌روغن|Salooneh meat, low-oil|139|13|6|7|
سالونه سبزی|Salooneh sabzi|80|3|8|4|
سالونه سبزی کم‌روغن|Salooneh sabzi, low-oil|62|3|8|2|
ته‌دیگ بندری|Bandari tahdig|232|4|36|8|
ته‌دیگ بندری کم‌روغن|Bandari tahdig, low-oil|214|4|36|6|
هلبا ساده|Helba plain|123|5|10|7|
هلبا ساده کم‌روغن|Helba plain, low-oil|105|5|10|5|
حلوای قند|Halva ghand|302|3|50|10|
حلوای قند کم‌روغن|Halva ghand, low-oil|284|3|50|8|
کباب ماهیچه جنوبی|Southern shank kabab|227|22|1|15|
کباب ماهیچه جنوبی کم‌روغن|Southern shank kabab, low-oil|209|22|1|13|
نان تنوری جنوب|Southern tanoori bread|262|9|52|2|
نان تنوری جنوب کم‌روغن|Southern tanoori bread, low-oil|245|9|52|0.1|
ماهی تن‌کباب|Tuna kabab|150|23|1|6|
ماهی تن‌کباب کم‌روغن|Tuna kabab, low-oil|132|23|1|4|
خورش ماهی شوریده|Shurideh fish stew|126|13|5|6|
خورش ماهی شوریده کم‌روغن|Shurideh fish stew, low-oil|108|13|5|4|
خورش ماهی هامور|Hamoor fish stew|122|12|5|6|
خورش ماهی هامور کم‌روغن|Hamoor fish stew, low-oil|104|12|5|4|
شکم‌پر ماهی جنوبی|Southern stuffed fish|147|16|5|7|
شکم‌پر ماهی جنوبی کم‌روغن|Southern stuffed fish, low-oil|129|16|5|5|
کباب ماهی هامور|Hamoor kabab|141|23|1|5|
کباب ماهی هامور کم‌روغن|Hamoor kabab, low-oil|123|23|1|3|
میگو سوخاری کم‌روغن|Fried shrimp, low-oil|211|16|12|11|
میگو سرخ شده با سیر|Garlic fried shrimp|160|19|3|8|
میگو سرخ شده با سیر کم‌روغن|Garlic fried shrimp, low-oil|142|19|3|6|
خوراک میگو|Shrimp khorak|134|14|6|6|
خوراک میگو کم‌روغن|Shrimp khorak, low-oil|116|14|6|4|
خوراک ماهی کم‌روغن|Fish khorak, low-oil|112|14|5|4|
اشکنه|Eshkeneh|107|5|6|7|
اشکنه کم‌روغن|Eshkeneh, low-oil|89|5|6|5|
خورش ماهی با نارنج|Narenj fish stew|122|12|5|6|
خورش ماهی با نارنج کم‌روغن|Narenj fish stew, low-oil|104|12|5|4|
ماهی قلیه|Mahi ghalieh dry|143|16|4|7|
ماهی قلیه کم‌روغن|Mahi ghalieh dry, low-oil|125|16|4|5|
دمپخت ماهی|Dampokht mahi|169|9|22|5|
دمپخت ماهی کم‌روغن|Dampokht mahi, low-oil|151|9|22|3|
پلو ماهی خلیج|Persian Gulf fish polo|177|9|24|5|
پلو ماهی خلیج کم‌روغن|Persian Gulf fish polo, low-oil|159|9|24|3|
قلیه ماهی بلوچی|Baluchi ghalieh|110|10|4|6|
قلیه ماهی بلوچی کم‌روغن|Baluchi ghalieh, low-oil|92|10|4|4|
نان ساج کم‌روغن|Saj bread, low-oil|225|8|48|0.1|
دیزی بلوچی|Baluchi dizi|126|8|10|6|
دیزی بلوچی کم‌روغن|Baluchi dizi, low-oil|108|8|10|4|
سجی|Saji|200|22|1|12|
سجی کم‌روغن|Saji, low-oil|182|22|1|10|
خشک‌پز|Khoshk paz|128|10|4|8|
خشک‌پز کم‌روغن|Khoshk paz, low-oil|110|10|4|6|
بلوچی خورش|Baluchi stew|140|9|8|8|
بلوچی خورش کم‌روغن|Baluchi stew, low-oil|122|9|8|6|
ماهی قره‌قره|Fried mahi|165|18|3|9|
ماهی قره‌قره کم‌روغن|Fried mahi, low-oil|147|18|3|7|
کباب بلوچی|Baluchi kabab|222|23|1|14|
کباب بلوچی کم‌روغن|Baluchi kabab, low-oil|204|23|1|12|
برنج بلوچی|Baluchi rice|156|3|27|4|
برنج بلوچی کم‌روغن|Baluchi rice, low-oil|138|3|27|2|
شیر شتر کم‌روغن|Camel milk, low-oil|39|3|4.5|1|
آش بلوچی|Baluchi ash|74|3|10|2.4|
آش بلوچی کم‌روغن|Baluchi ash, low-oil|56|3|10|0.4|
ماهی خشک بلوچ|Baluchi dried fish|234|45|0|6|
ماهی خشک بلوچ کم‌روغن|Baluchi dried fish, low-oil|216|45|0|4|
نان خرما بلوچی|Baluchi date bread|316|6|55|8|
نان خرما بلوچی کم‌روغن|Baluchi date bread, low-oil|298|6|55|6|
بزقورمه|Bozghorme|230|17|0|18|بز‌قورمه
بزقورمه کم‌روغن|Bozghorme, low-oil|212|17|0|16|بز‌قورمه
شیشلیک خراسانی|Khorasani shishlik|214|22|0|14|
شیشلیک خراسانی کم‌روغن|Khorasani shishlik, low-oil|196|22|0|12|
کباب بره خراسانی|Khorasani lamb kabab|223|22|0|15|
کباب بره خراسانی کم‌روغن|Khorasani lamb kabab, low-oil|205|22|0|13|
خورش ترش خراسانی|Khorasani sour stew|157|9|10|9|
خورش ترش خراسانی کم‌روغن|Khorasani sour stew, low-oil|139|9|10|7|
کلم‌قمری مشهدی|Mashhadi kohlrabi|72|3|6|4|
کلم‌قمری مشهدی کم‌روغن|Mashhadi kohlrabi, low-oil|54|3|6|2|
قیمه نثار مشهدی|Mashhadi gheymeh nesar|175|8|11|11|
قیمه نثار مشهدی کم‌روغن|Mashhadi gheymeh nesar, low-oil|157|8|11|9|
شله مشهدی با برنج|Mashhadi sholeh with rice|128|5|18|4|
شله مشهدی با برنج کم‌روغن|Mashhadi sholeh with rice, low-oil|110|5|18|2|
سیب زمینی پخته مشهدی|Mashhadi potato|120|3|18|4|
سیب زمینی پخته مشهدی کم‌روغن|Mashhadi potato, low-oil|102|3|18|2|
پلو زرشکی خراسانی|Khorasani zereshk polo|160|3|28|4|
پلو زرشکی خراسانی کم‌روغن|Khorasani zereshk polo, low-oil|142|3|28|2|
آش دوغ مشهدی|Mashhadi doogh ash|64|2.6|8|2.4|
آش دوغ مشهدی کم‌روغن|Mashhadi doogh ash, low-oil|46|2.6|8|0.4|
فرنی خراسانی|Khorasani ferni|115|3|19|3|
فرنی خراسانی کم‌روغن|Khorasani ferni, low-oil|97|3|19|1|
دیزی مشهدی|Mashhadi dizi|139|9|10|7|
دیزی مشهدی کم‌روغن|Mashhadi dizi, low-oil|121|9|10|5|
کباب ماهیچه مشهدی|Mashhadi shank kabab|218|23|0|14|
کباب ماهیچه مشهدی کم‌روغن|Mashhadi shank kabab, low-oil|200|23|0|12|
کباب برگ مشهد|Mashhad kabab barg|190|25|0|10|
کباب برگ مشهد کم‌روغن|Mashhad kabab barg, low-oil|172|25|0|8|
آبگوشت خراسانی|Khorasani abgoosht|122|8|9|6|
آبگوشت خراسانی کم‌روغن|Khorasani abgoosht, low-oil|104|8|9|4|
خورش ماست خراسانی|Khorasani yogurt stew|141|7|8|9|
خورش ماست خراسانی کم‌روغن|Khorasani yogurt stew, low-oil|123|7|8|7|
گوشت‌آب‌پز مشهدی|Mashhadi boiled meat|188|20|0|12|
گوشت‌آب‌پز مشهدی کم‌روغن|Mashhadi boiled meat, low-oil|170|20|0|10|
ترشی انجیر خراسانی|Khorasani fig pickle|57|1|12|0.5|
ترشی انجیر خراسانی کم‌روغن|Khorasani fig pickle, low-oil|53|1|12|0.1|
کوکو سیب‌زمینی مشهدی|Mashhadi potato kuku|187|6|16|11|
کوکو سیب‌زمینی مشهدی کم‌روغن|Mashhadi potato kuku, low-oil|169|6|16|9|
نان بربری خراسان|Khorasan barbari|262|9|52|2|
نان بربری خراسان کم‌روغن|Khorasan barbari, low-oil|245|9|52|0.1|
زعفران پلو|Saffron polo|154|2.6|28|3.5|
زعفران پلو کم‌روغن|Saffron polo, low-oil|136|2.6|28|1.5|
زرشک و کشمش مشهدی|Mashhadi zereshk raisin|275|2|60|3|
زرشک و کشمش مشهدی کم‌روغن|Mashhadi zereshk raisin, low-oil|257|2|60|1|
آش ماش خراسانی|Khorasani mash ash|80|4|11|2.2|
آش ماش خراسانی کم‌روغن|Khorasani mash ash, low-oil|62|4|11|0.2|
کباب کوبیده بجنوردی|Bojnurdi koobideh|215|19|1|15|
کباب کوبیده بجنوردی کم‌روغن|Bojnurdi koobideh, low-oil|197|19|1|13|
قرمه‌سبزی نیشابوری|Neyshabouri ghormeh sabzi|128|8|6|8|
قرمه‌سبزی نیشابوری کم‌روغن|Neyshabouri ghormeh sabzi, low-oil|110|8|6|6|
شیرینی گردو نیشابور|Neishabur walnut sweet|406|6|55|18|
شیرینی گردو نیشابور کم‌روغن|Neishabur walnut sweet, low-oil|388|6|55|16|
سیرابی مشهدی|Mashhadi sirabi|102|10|2|6|
سیرابی مشهدی کم‌روغن|Mashhadi sirabi, low-oil|84|10|2|4|
بریانی اصفهانی|Isfahani beryani|193|17|2|13|بریونی
بریانی اصفهانی کم‌روغن|Isfahani beryani, low-oil|175|17|2|11|بریونی
بریانی با نان|Beryani with bread|251|14|24|11|
بریانی با نان کم‌روغن|Beryani with bread, low-oil|233|14|24|9|
بریانی کم‌چرب|Lean beryani|160|20|2|8|
بریانی کم‌چرب کم‌روغن|Lean beryani, low-oil|142|20|2|6|
خورش ماست اصفهانی|Isfahani yogurt stew|145|8|8|9|
خورش ماست اصفهانی کم‌روغن|Isfahani yogurt stew, low-oil|127|8|8|7|
حلیم بادمجان اصفهانی|Isfahani halim bademjan|99|3|6|7|
حلیم بادمجان اصفهانی کم‌روغن|Isfahani halim bademjan, low-oil|81|3|6|5|
خورش گردو اصفهانی|Isfahani walnut stew|154|6|10|10|
خورش گردو اصفهانی کم‌روغن|Isfahani walnut stew, low-oil|136|6|10|8|
خورش قیمه اصفهانی|Isfahani gheymeh|153|8|10|9|
خورش قیمه اصفهانی کم‌روغن|Isfahani gheymeh, low-oil|135|8|10|7|
چلو خورشت اصفهانی|Isfahani chelo khoresht|163|7|18|7|
چلو خورشت اصفهانی کم‌روغن|Isfahani chelo khoresht, low-oil|145|7|18|5|
پلو مرغ اصفهانی|Isfahani chicken polo|169|9|22|5|
پلو مرغ اصفهانی کم‌روغن|Isfahani chicken polo, low-oil|151|9|22|3|
کوبیده اصفهانی|Isfahani koobideh|224|19|1|16|
کوبیده اصفهانی کم‌روغن|Isfahani koobideh, low-oil|206|19|1|14|
کباب بربری اصفهانی|Isfahani kabab|266|20|24|10|
کباب بربری اصفهانی کم‌روغن|Isfahani kabab, low-oil|248|20|24|8|
کوفته اصفهانی|Isfahani kufteh|165|9|12|9|
کوفته اصفهانی کم‌روغن|Isfahani kufteh, low-oil|147|9|12|7|
شامی اصفهانی|Isfahani shami|187|12|10|11|
شامی اصفهانی کم‌روغن|Isfahani shami, low-oil|169|12|10|9|
گز اصفهانی|Isfahani gaz|390|5|70|10|
گز اصفهانی کم‌روغن|Isfahani gaz, low-oil|372|5|70|8|
گز شکری|Gaz shekari|377|3|80|5|
گز شکری کم‌روغن|Gaz shekari, low-oil|359|3|80|3|
پولکی اصفهانی|Isfahani poolaki|409|0.5|95|3|
پولکی اصفهانی کم‌روغن|Isfahani poolaki, low-oil|391|0.5|95|1|
خورشت ماست|Khoresht mast|133|7|6|9|
خورشت ماست کم‌روغن|Khoresht mast, low-oil|115|7|6|7|
فرنی اصفهانی|Isfahani ferni|115|3|19|3|
فرنی اصفهانی کم‌روغن|Isfahani ferni, low-oil|97|3|19|1|
لوز نارگیل کم‌روغن|Looz narges, low-oil|487|8|62|23|
سوهان اصفهانی|Isfahani sohan|458|5|60|22|
سوهان اصفهانی کم‌روغن|Isfahani sohan, low-oil|440|5|60|20|
کشک‌بادمجان اصفهانی|Isfahani kashk bademjan|112|4|6|8|
کشک‌بادمجان اصفهانی کم‌روغن|Isfahani kashk bademjan, low-oil|94|4|6|6|
آش بلغور اصفهانی|Isfahani bulgur ash|86|4|12|2.4|
آش بلغور اصفهانی کم‌روغن|Isfahani bulgur ash, low-oil|68|4|12|0.4|
کباب بره اصفهانی|Isfahani lamb kabab|223|22|0|15|
کباب بره اصفهانی کم‌روغن|Isfahani lamb kabab, low-oil|205|22|0|13|
نان بربری اصفهانی|Isfahani barbari|262|9|52|2|
نان بربری اصفهانی کم‌روغن|Isfahani barbari, low-oil|245|9|52|0.1|
قطاب یزدی|Ghotab|424|6|55|20|قطاب
قطاب یزدی کم‌روغن|Ghotab, low-oil|406|6|55|18|قطاب
قیمه یزدی|Yazdi gheymeh|149|7|10|9|
قیمه یزدی کم‌روغن|Yazdi gheymeh, low-oil|131|7|10|7|
خورش ماست یزدی|Yazdi yogurt stew|141|7|8|9|
خورش ماست یزدی کم‌روغن|Yazdi yogurt stew, low-oil|123|7|8|7|
آش دوغ یزدی|Yazdi doogh ash|64|2.6|8|2.4|
آش دوغ یزدی کم‌روغن|Yazdi doogh ash, low-oil|46|2.6|8|0.4|
آش کدو یزدی|Yazdi kadoo ash|61|2.2|8|2.2|
آش کدو یزدی کم‌روغن|Yazdi kadoo ash, low-oil|43|2.2|8|0.2|
شیرینی‌برنجی یزدی|Yazdi berenji|408|6|60|16|
شیرینی‌برنجی یزدی کم‌روغن|Yazdi berenji, low-oil|390|6|60|14|
باقلوا یزدی|Yazdi baklava|432|6|48|24|
باقلوا یزدی کم‌روغن|Yazdi baklava, low-oil|414|6|48|22|
پشمک یزدی|Yazdi pashmak|382|2|80|6|
پشمک یزدی کم‌روغن|Yazdi pashmak, low-oil|364|2|80|4|
نان یزدی|Yazdi bread|259|8|50|3|
نان یزدی کم‌روغن|Yazdi bread, low-oil|241|8|50|1|
نان رول یزدی|Yazdi rolled bread|294|8|52|6|
نان رول یزدی کم‌روغن|Yazdi rolled bread, low-oil|276|8|52|4|
زولبیا بامیه یزدی|Yazdi zoolbia|388|3|58|16|
زولبیا بامیه یزدی کم‌روغن|Yazdi zoolbia, low-oil|370|3|58|14|
حاجی‌بادام یزد|Haj badam of Yazd|452|8|60|20|
حاجی‌بادام یزد کم‌روغن|Haj badam of Yazd, low-oil|434|8|60|18|
ترشی یزدی|Yazdi torshi|102|2|10|6|
ترشی یزدی کم‌روغن|Yazdi torshi, low-oil|84|2|10|4|
کلوچه یزدی|Yazdi koloocheh|392|6|56|16|
کلوچه یزدی کم‌روغن|Yazdi koloocheh, low-oil|374|6|56|14|
دلمه یزدی|Yazdi dolmeh|130|5|14|6|
دلمه یزدی کم‌روغن|Yazdi dolmeh, low-oil|112|5|14|4|
کوفته یزدی|Yazdi kufteh|165|9|12|9|
کوفته یزدی کم‌روغن|Yazdi kufteh, low-oil|147|9|12|7|
خورش قیمه کرمانی|Kermani gheymeh|153|8|10|9|
خورش قیمه کرمانی کم‌روغن|Kermani gheymeh, low-oil|135|8|10|7|
کلوچه کرمانی|Kermani koloocheh|392|6|56|16|
کلوچه کرمانی کم‌روغن|Kermani koloocheh, low-oil|374|6|56|14|
قطاب کرمان|Kerman ghotab|428|6|56|20|
قطاب کرمان کم‌روغن|Kerman ghotab, low-oil|410|6|56|18|
خورش شیرین کرمانی|Kermani sweet stew|169|8|14|9|
خورش شیرین کرمانی کم‌روغن|Kermani sweet stew, low-oil|151|8|14|7|
کماج کرمانی|Kerman komaj|358|6|52|14|
کماج کرمانی کم‌روغن|Kerman komaj, low-oil|340|6|52|12|
کباب کرمانی|Kerman kabab|214|21|1|14|
کباب کرمانی کم‌روغن|Kerman kabab, low-oil|196|21|1|12|
آش کرمانی|Kerman ash|79|3.4|11|2.4|
آش کرمانی کم‌روغن|Kerman ash, low-oil|61|3.4|11|0.4|
حلوا کرمانی|Kerman halva|314|3|44|14|
حلوا کرمانی کم‌روغن|Kerman halva, low-oil|296|3|44|12|
شیرینی کرمان|Kerman sweet|404|5|60|16|
شیرینی کرمان کم‌روغن|Kerman sweet, low-oil|386|5|60|14|
خرما کرمان|Kerman dates|310|2|75|0.2|
خرما کرمان کم‌روغن|Kerman dates, low-oil|309|2|75|0.1|
بریانی کرمانی|Kermani beryani|193|16|3|13|
بریانی کرمانی کم‌روغن|Kermani beryani, low-oil|175|16|3|11|
آبگوشت کرمانی|Kermani abgoosht|122|8|9|6|
آبگوشت کرمانی کم‌روغن|Kermani abgoosht, low-oil|104|8|9|4|
پلو بادمجان کرمانی|Kermani bademjan polo|163|3.5|26|5|
پلو بادمجان کرمانی کم‌روغن|Kermani bademjan polo, low-oil|145|3.5|26|3|
شیرازی سالاد|Shirazi salad|47|1|4|3|سالاد شیرازی
شیرازی سالاد کم‌روغن|Shirazi salad, low-oil|29|1|4|1|سالاد شیرازی
کلم پلو شیرازی|Shirazi kalam polo|153|5|22|5|
کلم پلو شیرازی کم‌روغن|Shirazi kalam polo, low-oil|135|5|22|3|
کلم‌پلو با مرغ شیرازی|Shirazi kalam polo with chicken|149|8|18|5|
کلم‌پلو با مرغ شیرازی کم‌روغن|Shirazi kalam polo with chicken, low-oil|131|8|18|3|
کلم پلو با گوشت شیرازی|Shirazi kalam polo with lamb|176|8|18|8|
کلم پلو با گوشت شیرازی کم‌روغن|Shirazi kalam polo with lamb, low-oil|158|8|18|6|
کوفته شیرازی با گوشت|Shirazi meat kufteh|157|9|10|9|
کوفته شیرازی با گوشت کم‌روغن|Shirazi meat kufteh, low-oil|139|9|10|7|
فالوده شیرازی کم‌روغن|Shirazi faloodeh, low-oil|101|1|24|0.1|
شیرازی ماست و خیار|Shirazi mast o khiar|59|3|5|3|ماست و خیار شیرازی
شیرازی ماست و خیار کم‌روغن|Shirazi mast o khiar, low-oil|41|3|5|1|ماست و خیار شیرازی
خورش بادمجان شیرازی|Shirazi bademjan stew|124|7|6|8|
خورش بادمجان شیرازی کم‌روغن|Shirazi bademjan stew, low-oil|106|7|6|6|
قلیه ماهی شیرازی|Shirazi ghalieh|110|9|5|6|
قلیه ماهی شیرازی کم‌روغن|Shirazi ghalieh, low-oil|92|9|5|4|
نان مسقطی شیراز|Shiraz masghati bread|318|5|52|10|
نان مسقطی شیراز کم‌روغن|Shiraz masghati bread, low-oil|300|5|52|8|
حلیم شیرازی|Shirazi haleem|129|9|12|5|
حلیم شیرازی کم‌روغن|Shirazi haleem, low-oil|111|9|12|3|
حلوا ارده شیراز|Shiraz halva ardeh|442|9|52|22|
حلوا ارده شیراز کم‌روغن|Shiraz halva ardeh, low-oil|424|9|52|20|
دوغ شیرازی|Shirazi doogh|34|2|3|1.5|
دوغ شیرازی کم‌روغن|Shirazi doogh, low-oil|21|2|3|0.1|
کباب کوبیده شیرازی|Shirazi koobideh|215|19|1|15|
کباب کوبیده شیرازی کم‌روغن|Shirazi koobideh, low-oil|197|19|1|13|
ترشی لیته شیراز|Shiraz torshi liteh|93|2|10|5|
ترشی لیته شیراز کم‌روغن|Shiraz torshi liteh, low-oil|75|2|10|3|
ماست موسیر کم‌روغن|Mast musir, low-oil|41|3|5|1|
موسیر ترشی|Musir pickle|59|2|12|0.3|ترشی موسیر
موسیر ترشی کم‌روغن|Musir pickle, low-oil|57|2|12|0.1|ترشی موسیر
مرغ و سبزی شیرازی|Shirazi chicken with herbs|127|12|4|7|
مرغ و سبزی شیرازی کم‌روغن|Shirazi chicken with herbs, low-oil|109|12|4|5|
آب‌گوشت شیرازی|Shirazi abgoosht|122|8|9|6|
آب‌گوشت شیرازی کم‌روغن|Shirazi abgoosht, low-oil|104|8|9|4|
کباب کوبیده کرمانشاهی|Kermanshah koobideh|219|20|1|15|
کباب کوبیده کرمانشاهی کم‌روغن|Kermanshah koobideh, low-oil|201|20|1|13|
نان برنجی کرمانشاه|Kermanshah nan berenji|432|5|58|20|
نان برنجی کرمانشاه کم‌روغن|Kermanshah nan berenji, low-oil|414|5|58|18|
چیزلی کرمانشاهی|Chizli|146|9|5|10|
چیزلی کرمانشاهی کم‌روغن|Chizli, low-oil|128|9|5|8|
آش ترخینه کرمانشاه|Kermanshah tarkhineh ash|85|3.4|12|2.6|
آش ترخینه کرمانشاه کم‌روغن|Kermanshah tarkhineh ash, low-oil|67|3.4|12|0.6|
حلوا کرمانشاهی|Kermanshah halva|314|3|44|14|
حلوا کرمانشاهی کم‌روغن|Kermanshah halva, low-oil|296|3|44|12|
روغن حیوانی کرمانشاه|Kermanshah ghee|891|0|0|99|
روغن حیوانی کرمانشاه کم‌روغن|Kermanshah ghee, low-oil|873|0|0|97|
آب‌گوشت لری|Luri abgoosht|122|8|9|6|
آب‌گوشت لری کم‌روغن|Luri abgoosht, low-oil|104|8|9|4|
کباب لری|Luri kabab|209|22|1|13|
کباب لری کم‌روغن|Luri kabab, low-oil|191|22|1|11|
نان کولیچه لری|Luri koolicheh|334|6|55|10|
نان کولیچه لری کم‌روغن|Luri koolicheh, low-oil|316|6|55|8|
شیرینی لری|Luri sweet|378|5|58|14|
شیرینی لری کم‌روغن|Luri sweet, low-oil|360|5|58|12|
آش لری|Luri ash|74|3|10|2.4|
آش لری کم‌روغن|Luri ash, low-oil|56|3|10|0.4|
نان فطیر لری|Luri fatir|344|7|52|12|
نان فطیر لری کم‌روغن|Luri fatir, low-oil|326|7|52|10|
ترخینه لری|Luri tarkhineh|85|3.4|12|2.6|
ترخینه لری کم‌روغن|Luri tarkhineh, low-oil|67|3.4|12|0.6|
ماهی تابه‌ای گلستان|Golestan pan fish|165|18|3|9|
ماهی تابه‌ای گلستان کم‌روغن|Golestan pan fish, low-oil|147|18|3|7|
جوجه کباب ترکمنی|Turkmen joojeh|181|24|1|9|
جوجه کباب ترکمنی کم‌روغن|Turkmen joojeh, low-oil|163|24|1|7|
کباب ترکمنی|Turkmen kabab|209|22|1|13|
کباب ترکمنی کم‌روغن|Turkmen kabab, low-oil|191|22|1|11|
نان ترکمنی|Turkmen bread|259|8|50|3|
نان ترکمنی کم‌روغن|Turkmen bread, low-oil|241|8|50|1|
چوروک ترکمنی|Choorek|306|6|48|10|
چوروک ترکمنی کم‌روغن|Choorek, low-oil|288|6|48|8|
سمنو ترکمنی|Turkmen samanu|147|3|28|2.5|
سمنو ترکمنی کم‌روغن|Turkmen samanu, low-oil|129|3|28|0.5|
قتلمه‌ترکمنی|Gatlama|310|7|48|10|
قتلمه‌ترکمنی کم‌روغن|Gatlama, low-oil|292|7|48|8|
آش ترکمنی|Turkmen ash|76|3.6|10|2.4|
آش ترکمنی کم‌روغن|Turkmen ash, low-oil|58|3.6|10|0.4|
قاتیق‌ترکمنی|Turkmen yogurt|59|3.5|4.5|3|
قاتیق‌ترکمنی کم‌روغن|Turkmen yogurt, low-oil|41|3.5|4.5|1|
خوراک ماهی ترکمنی|Turkmen fish dish|130|14|5|6|
خوراک ماهی ترکمنی کم‌روغن|Turkmen fish dish, low-oil|112|14|5|4|
دیزی همدان|Hamedan dizi|126|8|10|6|
دیزی همدان کم‌روغن|Hamedan dizi, low-oil|108|8|10|4|
کباب سنتی همدان|Hamedan kabab|214|21|1|14|
کباب سنتی همدان کم‌روغن|Hamedan kabab, low-oil|196|21|1|12|
نان گردویی همدان|Hamedan walnut bread|320|8|45|12|
نان گردویی همدان کم‌روغن|Hamedan walnut bread, low-oil|302|8|45|10|
شیرینی همدان|Hamedan sweet|400|6|58|16|
شیرینی همدان کم‌روغن|Hamedan sweet, low-oil|382|6|58|14|
کوکو همدانی|Hamedani kuku|151|8|5|11|
کوکو همدانی کم‌روغن|Hamedani kuku, low-oil|133|8|5|9|
خورش قیمه همدانی|Hamedani gheymeh|149|7|10|9|
خورش قیمه همدانی کم‌روغن|Hamedani gheymeh, low-oil|131|7|10|7|
حلوا همدانی|Hamedani halva|314|3|44|14|
حلوا همدانی کم‌روغن|Hamedani halva, low-oil|296|3|44|12|
باقلوا قزوین|Qazvin baklava|432|6|48|24|
باقلوا قزوین کم‌روغن|Qazvin baklava, low-oil|414|6|48|22|
نان باقلوا قزوین|Qazvin baghlava|404|6|50|20|
نان باقلوا قزوین کم‌روغن|Qazvin baghlava, low-oil|386|6|50|18|
کباب بره قزوین|Qazvin lamb kabab|223|22|0|15|
کباب بره قزوین کم‌روغن|Qazvin lamb kabab, low-oil|205|22|0|13|
آش قزوین|Qazvin ash|74|3|10|2.4|
آش قزوین کم‌روغن|Qazvin ash, low-oil|56|3|10|0.4|
خورش قلیه قزوینی|Qazvin ghalieh|132|7|8|8|
خورش قلیه قزوینی کم‌روغن|Qazvin ghalieh, low-oil|114|7|8|6|
پولکی قم|Qom poolaki|409|0.5|95|3|
پولکی قم کم‌روغن|Qom poolaki, low-oil|391|0.5|95|1|
سوهان قم کم‌روغن|Qom sohan, low-oil|440|5|60|20|
کباب کوبیده قمی|Qomi koobideh|224|19|1|16|
کباب کوبیده قمی کم‌روغن|Qomi koobideh, low-oil|206|19|1|14|
قم نان|Qom bread|267|8|52|3|
قم نان کم‌روغن|Qom bread, low-oil|249|8|52|1|
کوفته زنجانی|Zanjan kufteh|165|9|12|9|
کوفته زنجانی کم‌روغن|Zanjan kufteh, low-oil|147|9|12|7|
آش دوغ زنجانی|Zanjani doogh ash|64|2.6|8|2.4|
آش دوغ زنجانی کم‌روغن|Zanjani doogh ash, low-oil|46|2.6|8|0.4|
کباب زنجان|Zanjan kabab|219|20|1|15|
کباب زنجان کم‌روغن|Zanjan kabab, low-oil|201|20|1|13|
نان زنجانی|Zanjani bread|258|8|52|2|
نان زنجانی کم‌روغن|Zanjani bread, low-oil|241|8|52|0.1|
شیرینی زنجان|Zanjan sweet|404|5|60|16|
شیرینی زنجان کم‌روغن|Zanjan sweet, low-oil|386|5|60|14|
خورش سمنان|Semnan stew|144|8|10|8|
خورش سمنان کم‌روغن|Semnan stew, low-oil|126|8|10|6|
نان ماه‌تابه سمنان|Semnan bread|259|8|50|3|
نان ماه‌تابه سمنان کم‌روغن|Semnan bread, low-oil|241|8|50|1|
دیزی ترشی|Dizi torshi|126|8|10|6|
دیزی ترشی کم‌روغن|Dizi torshi, low-oil|108|8|10|4|
حلوا سمنان|Semnan halva|314|3|44|14|
حلوا سمنان کم‌روغن|Semnan halva, low-oil|296|3|44|12|
آش ساوه|Saveh ash|74|3|10|2.4|
آش ساوه کم‌روغن|Saveh ash, low-oil|56|3|10|0.4|
ترخینه ساوه|Saveh tarkhineh|85|3.4|12|2.6|
ترخینه ساوه کم‌روغن|Saveh tarkhineh, low-oil|67|3.4|12|0.6|
شیرینی ساوه|Saveh sweet|404|5|60|16|
شیرینی ساوه کم‌روغن|Saveh sweet, low-oil|386|5|60|14|
خورش شلغم ملایر|Malayer turnip stew|119|6|8|7|
خورش شلغم ملایر کم‌روغن|Malayer turnip stew, low-oil|101|6|8|5|
کوفته شهرضا|Shahreza kufteh|165|9|12|9|
کوفته شهرضا کم‌روغن|Shahreza kufteh, low-oil|147|9|12|7|
خورش ساوه|Saveh stew|140|8|9|8|
خورش ساوه کم‌روغن|Saveh stew, low-oil|122|8|9|6|
کوفته سمنانی|Semnan kufteh|165|9|12|9|
کوفته سمنانی کم‌روغن|Semnan kufteh, low-oil|147|9|12|7|
آش شولی|Shooli ash|74|3|10|2.4|
آش شولی کم‌روغن|Shooli ash, low-oil|56|3|10|0.4|
آش کنگر سمنان|Semnan ash kangar|61|2.4|8|2.2|
آش کنگر سمنان کم‌روغن|Semnan ash kangar, low-oil|43|2.4|8|0.2|
حلیم گندم و گوشت|Wheat meat haleem|129|8|13|5|
حلیم گندم و گوشت کم‌روغن|Wheat meat haleem, low-oil|111|8|13|3|
حلیم بوقلمون|Turkey haleem|124|9|13|4|
حلیم بوقلمون کم‌روغن|Turkey haleem, low-oil|106|9|13|2|
حلیم مرغ|Chicken haleem|120|8|13|4|
حلیم مرغ کم‌روغن|Chicken haleem, low-oil|102|8|13|2|
حلیم با شکر و دارچین کم‌روغن|Haleem with sugar cinnamon, low-oil|131|8|18|3|
حلیم با شکر و کره|Haleem with sugar butter|172|8|17|8|
حلیم با شکر و کره کم‌روغن|Haleem with sugar butter, low-oil|154|8|17|6|
حلیم با روغن حیوانی|Haleem with ghee|156|8|13|8|
حلیم با روغن حیوانی کم‌روغن|Haleem with ghee, low-oil|138|8|13|6|
حلیم شیرین|Sweet haleem|161|7|22|5|
حلیم شیرین کم‌روغن|Sweet haleem, low-oil|143|7|22|3|
حلیم بدون گوشت|Haleem without meat|107|4|16|3|
حلیم بدون گوشت کم‌روغن|Haleem without meat, low-oil|89|4|16|1|
حلیم کم‌چرب|Low-fat haleem|111|9|13|2.5|
حلیم کم‌چرب کم‌روغن|Low-fat haleem, low-oil|93|9|13|0.5|
حلیم عدس|Lentil haleem|128|7|16|4|
حلیم عدس کم‌روغن|Lentil haleem, low-oil|110|7|16|2|
حلیم جو کم‌روغن|Barley haleem, low-oil|106|8|14|2|
حلیم با عسل|Haleem with honey|153|8|19|5|
حلیم با عسل کم‌روغن|Haleem with honey, low-oil|135|8|19|3|
کله پاچه کم‌روغن|Kaleh pacheh, low-oil|150|14|1|10|کله‌پاچه
کله پاچه با زبان کم‌روغن|Kaleh pacheh with tongue, low-oil|190|15|1|14|
کله پاچه با مغز|Kaleh pacheh with brain|182|13|1|14|
کله پاچه با مغز کم‌روغن|Kaleh pacheh with brain, low-oil|164|13|1|12|
کله پاچه با چشم|Kaleh pacheh with eye|177|14|1|13|
کله پاچه با چشم کم‌روغن|Kaleh pacheh with eye, low-oil|159|14|1|11|
پاچه گوسفند|Sheep trotters|158|16|1|10|
پاچه گوسفند کم‌روغن|Sheep trotters, low-oil|140|16|1|8|
زبان گوسفند پخته|Cooked lamb tongue|266|17|0|22|
زبان گوسفند پخته کم‌روغن|Cooked lamb tongue, low-oil|248|17|0|20|
مغز گوسفند پخته|Cooked lamb brain|134|10|1|10|
مغز گوسفند پخته کم‌روغن|Cooked lamb brain, low-oil|116|10|1|8|
گردن گوسفندی پخته|Cooked lamb neck|264|21|0|20|
گردن گوسفندی پخته کم‌روغن|Cooked lamb neck, low-oil|246|21|0|18|
شیردان پخته|Cooked shirdan|216|18|0|16|
شیردان پخته کم‌روغن|Cooked shirdan, low-oil|198|18|0|14|
سیرابی‌شیردان کم‌روغن|Sirabi shirdan, low-oil|75|10|2|3|
جگر سفید|White liver|138|19|2|6|
جگر سفید کم‌روغن|White liver, low-oil|120|19|2|4|
جگر سرخ کرده با پیاز|Fried liver with onion|177|20|4|9|
جگر سرخ کرده با پیاز کم‌روغن|Fried liver with onion, low-oil|159|20|4|7|
جگر قلوه سرخ شده|Fried liver kidney|186|21|3|10|
جگر قلوه سرخ شده کم‌روغن|Fried liver kidney, low-oil|168|21|3|8|
دل قلوه|Del o ghelveh|182|20|3|10|دل‌و‌قلوه
دل قلوه کم‌روغن|Del o ghelveh, low-oil|164|20|3|8|دل‌و‌قلوه
دل قلوه با نان|Del o ghelveh with bread|200|16|16|8|
دل قلوه با نان کم‌روغن|Del o ghelveh with bread, low-oil|182|16|16|6|
دل قلوه با سس|Del o ghelveh with sauce|182|17|6|10|
دل قلوه با سس کم‌روغن|Del o ghelveh with sauce, low-oil|164|17|6|8|
جگر بره سرخ شده|Fried lamb liver|177|20|4|9|
جگر بره سرخ شده کم‌روغن|Fried lamb liver, low-oil|159|20|4|7|
دنبلان|Donbalan|214|12|1|18|
دنبلان کم‌روغن|Donbalan, low-oil|196|12|1|16|
خوراک دل و قلوه|Heart kidney khorak|173|18|5|9|
خوراک دل و قلوه کم‌روغن|Heart kidney khorak, low-oil|155|18|5|7|
خوراک زبان کم‌روغن|Tongue khorak, low-oil|184|14|5|12|
خوراک جگر کم‌روغن|Liver khorak, low-oil|142|17|5|6|
ساندویچ جگر کم‌روغن|Liver sandwich, low-oil|236|13|28|8|
ساندویچ دل قلوه|Del o ghelveh sandwich|250|14|26|10|
ساندویچ دل قلوه کم‌روغن|Del o ghelveh sandwich, low-oil|232|14|26|8|
ساندویچ زبان کم‌روغن|Tongue sandwich, low-oil|260|14|24|12|
ساندویچ کله پاچه|Kaleh pacheh sandwich|264|11|28|12|
ساندویچ کله پاچه کم‌روغن|Kaleh pacheh sandwich, low-oil|246|11|28|10|
سیرابی با نان|Sirabi with bread|161|9|20|5|
سیرابی با نان کم‌روغن|Sirabi with bread, low-oil|143|9|20|3|
عدسی صبحانه|Breakfast adasi|114|5.5|14|4|عدسی
عدسی صبحانه کم‌روغن|Breakfast adasi, low-oil|96|5.5|14|2|عدسی
عدسی با نان سنگک|Adasi with sangak|156|6|24|4|
عدسی با نان سنگک کم‌روغن|Adasi with sangak, low-oil|138|6|24|2|
عدسی با تخم‌مرغ و نان|Adasi with egg and bread|166|8|20|6|
عدسی با تخم‌مرغ و نان کم‌روغن|Adasi with egg and bread, low-oil|148|8|20|4|
املت ساده|Plain omelet|147|9|3|11|
املت ساده کم‌روغن|Plain omelet, low-oil|129|9|3|9|
املت گوجه کم‌روغن|Tomato omelet, low-oil|120|8|4|8|املت
املت با سیب‌زمینی|Omelet with potato|149|7|10|9|
املت با سیب‌زمینی کم‌روغن|Omelet with potato, low-oil|131|7|10|7|
املت با قارچ|Mushroom omelet|129|9|3|9|
املت با قارچ کم‌روغن|Mushroom omelet, low-oil|111|9|3|7|
املت با پنیر|Cheese omelet|173|11|3|13|
املت با پنیر کم‌روغن|Cheese omelet, low-oil|155|11|3|11|
املت با سوسیس|Sausage omelet|191|11|3|15|
املت با سوسیس کم‌روغن|Sausage omelet, low-oil|173|11|3|13|
املت با کالباس|Cold cut omelet|160|10|3|12|
املت با کالباس کم‌روغن|Cold cut omelet, low-oil|142|10|3|10|
املت با سبزی|Herb omelet|138|9|3|10|
املت با سبزی کم‌روغن|Herb omelet, low-oil|120|9|3|8|
املت بادمجان|Eggplant omelet|138|7|5|10|
املت بادمجان کم‌روغن|Eggplant omelet, low-oil|120|7|5|8|
املت با فلفل دلمه|Pepper omelet|129|8|4|9|
املت با فلفل دلمه کم‌روغن|Pepper omelet, low-oil|111|8|4|7|
املت با اسفناج|Spinach omelet|125|9|2|9|
املت با اسفناج کم‌روغن|Spinach omelet, low-oil|107|9|2|7|
املت با بادمجان و گوجه|Eggplant tomato omelet|133|7|6|9|
املت با بادمجان و گوجه کم‌روغن|Eggplant tomato omelet, low-oil|115|7|6|7|
نیمرو ساده|Plain fried egg|191|13|1|15|
نیمرو ساده کم‌روغن|Plain fried egg, low-oil|173|13|1|13|
نیمرو با پنیر|Fried egg with cheese|213|14|1|17|
نیمرو با پنیر کم‌روغن|Fried egg with cheese, low-oil|195|14|1|15|
نیمرو با گوجه|Fried egg with tomato|160|10|3|12|
نیمرو با گوجه کم‌روغن|Fried egg with tomato, low-oil|142|10|3|10|
نیمرو با سوسیس|Fried egg with sausage|200|12|2|16|
نیمرو با سوسیس کم‌روغن|Fried egg with sausage, low-oil|182|12|2|14|
نیمرو با روغن زیتون|Olive oil fried egg|182|13|1|14|
نیمرو با روغن زیتون کم‌روغن|Olive oil fried egg, low-oil|164|13|1|12|
نیمرو کم‌روغن|Low-oil fried egg|137|13|1|9|
نیمرو کم‌روغن کم‌روغن|Low-oil fried egg, low-oil|119|13|1|7|
خاگینه ساده|Plain khagineh|165|9|3|13|
خاگینه ساده کم‌روغن|Plain khagineh, low-oil|147|9|3|11|
خاگینه با گوجه|Tomato khagineh|151|8|5|11|
خاگینه با گوجه کم‌روغن|Tomato khagineh, low-oil|133|8|5|9|
خاگینه شیرین|Sweet khagineh|208|8|17|12|
خاگینه شیرین کم‌روغن|Sweet khagineh, low-oil|190|8|17|10|
خاگینه با پیاز|Khagineh with onion|169|9|4|13|
خاگینه با پیاز کم‌روغن|Khagineh with onion, low-oil|151|9|4|11|
خاگینه با پنیر|Khagineh with cheese|182|11|3|14|
خاگینه با پنیر کم‌روغن|Khagineh with cheese, low-oil|164|11|3|12|
کوکو صبحانه|Breakfast kuku|142|9|4|10|
کوکو صبحانه کم‌روغن|Breakfast kuku, low-oil|124|9|4|8|
تخم‌مرغ آب‌پز نیمرو|Soft boiled egg|146|13|1|10|تخم مرغ عسلی
تخم‌مرغ آب‌پز نیمرو کم‌روغن|Soft boiled egg, low-oil|128|13|1|8|تخم مرغ عسلی
تخم‌مرغ عسلی کم‌روغن|Honey-style egg, low-oil|128|13|1|8|
تخم‌مرغ شکم‌پر کم‌روغن|Deviled eggs, low-oil|143|9|2|11|
تخم‌مرغ با قارچ|Egg with mushroom|142|10|3|10|
تخم‌مرغ با قارچ کم‌روغن|Egg with mushroom, low-oil|124|10|3|8|
شکم‌پر تخم‌مرغ|Stuffed egg|152|9|2|12|
شکم‌پر تخم‌مرغ کم‌روغن|Stuffed egg, low-oil|134|9|2|10|
تخم‌مرغ و کره|Egg and butter|197|11|0|17|
تخم‌مرغ و کره کم‌روغن|Egg and butter, low-oil|179|11|0|15|
تخم‌مرغ مسما|Egg mosama|155|10|4|11|
تخم‌مرغ مسما کم‌روغن|Egg mosama, low-oil|137|10|4|9|
نان و پنیر و گردو کم‌روغن|Bread cheese walnut, low-oil|250|10|30|10|
نان و پنیر و سبزی کم‌روغن|Bread cheese herbs, low-oil|222|10|32|6|
نان و پنیر و خیار|Bread cheese cucumber|219|9|30|7|
نان و پنیر و خیار کم‌روغن|Bread cheese cucumber, low-oil|201|9|30|5|
نان و کره و مربا|Bread butter jam|320|5|48|12|
نان و کره و مربا کم‌روغن|Bread butter jam, low-oil|302|5|48|10|
نان و کره و عسل|Bread butter honey|320|5|48|12|
نان و کره و عسل کم‌روغن|Bread butter honey, low-oil|302|5|48|10|
نان و خامه و عسل|Bread cream honey|323|5|42|15|
نان و خامه و عسل کم‌روغن|Bread cream honey, low-oil|305|5|42|13|
نان و حلوا ارده کم‌روغن|Bread with halva ardeh, low-oil|340|9|40|16|
نان و شیره انگور و ارده|Bread molasses tahini|340|8|50|12|
نان و شیره انگور و ارده کم‌روغن|Bread molasses tahini, low-oil|322|8|50|10|
نان و شیره خرما|Bread date syrup|267|6|54|3|
نان و شیره خرما کم‌روغن|Bread date syrup, low-oil|249|6|54|1|
نان و پنیر و گوجه|Bread cheese tomato|219|9|30|7|
نان و پنیر و گوجه کم‌روغن|Bread cheese tomato, low-oil|201|9|30|5|
نان و کره و پنیر|Bread butter cheese|290|9|32|14|
نان و کره و پنیر کم‌روغن|Bread butter cheese, low-oil|272|9|32|12|
نان سنگک با پنیر و سبزی|Sangak cheese herbs|257|10|34|9|
نان سنگک با پنیر و سبزی کم‌روغن|Sangak cheese herbs, low-oil|239|10|34|7|
نان بربری با پنیر|Barbari with cheese|274|10|36|10|
نان بربری با پنیر کم‌روغن|Barbari with cheese, low-oil|256|10|36|8|
نان تافتون با پنیر|Taftoon with cheese|273|10|38|9|
نان تافتون با پنیر کم‌روغن|Taftoon with cheese, low-oil|255|10|38|7|
نان لواش با پنیر|Lavash with cheese|268|11|38|8|
نان لواش با پنیر کم‌روغن|Lavash with cheese, low-oil|250|11|38|6|
نان لواش و تخم‌مرغ|Lavash with egg|241|10|30|9|
نان لواش و تخم‌مرغ کم‌روغن|Lavash with egg, low-oil|223|10|30|7|
لقمه نان و پنیر و گردو|Cheese walnut roll|260|10|28|12|
لقمه نان و پنیر و گردو کم‌روغن|Cheese walnut roll, low-oil|242|10|28|10|
لقمه نان و کره و عسل|Butter honey roll|320|5|48|12|
لقمه نان و کره و عسل کم‌روغن|Butter honey roll, low-oil|302|5|48|10|
کتلت صبحانه|Breakfast kotlet|217|12|13|13|
کتلت صبحانه کم‌روغن|Breakfast kotlet, low-oil|199|12|13|11|
شیر و عسل|Milk and honey|99|3|15|3|
شیر و عسل کم‌روغن|Milk and honey, low-oil|81|3|15|1|
چای و نان خرما|Tea with date bread|248|4|40|8|
چای و نان خرما کم‌روغن|Tea with date bread, low-oil|230|4|40|6|
شیر و نان|Milk and bread|147|5|25|3|
شیر و نان کم‌روغن|Milk and bread, low-oil|129|5|25|1|
کاچی کم‌روغن|Kachi, low-oil|184|3|34|4|
کاچی با شکر|Kachi with sugar|218|3|38|6|
کاچی با شکر کم‌روغن|Kachi with sugar, low-oil|200|3|38|4|
کاچی با شیره|Kachi with molasses|226|3|40|6|
کاچی با شیره کم‌روغن|Kachi with molasses, low-oil|208|3|40|4|
کاچی با ارده|Kachi with tahini|240|4|38|8|
کاچی با ارده کم‌روغن|Kachi with tahini, low-oil|222|4|38|6|
شیر کاکائو با نان|Chocolate milk with bread|177|5|28|5|
شیر کاکائو با نان کم‌روغن|Chocolate milk with bread, low-oil|159|5|28|3|
پنیر و گردو و سبزی|Cheese walnut herbs|222|12|3|18|
پنیر و گردو و سبزی کم‌روغن|Cheese walnut herbs, low-oil|204|12|3|16|
عسل و کره|Honey and butter|379|0.3|45|22|
عسل و کره کم‌روغن|Honey and butter, low-oil|361|0.3|45|20|
خامه و عسل|Cream honey|289|1.5|28|19|
خامه و عسل کم‌روغن|Cream honey, low-oil|271|1.5|28|17|
شیره انگور و ارده|Grape syrup tahini|360|6|48|16|
شیره انگور و ارده کم‌روغن|Grape syrup tahini, low-oil|342|6|48|14|
سرشیر و عسل|Cream skimmed honey|270|2|25|18|
سرشیر و عسل کم‌روغن|Cream skimmed honey, low-oil|252|2|25|16|
کره بادام‌زمینی و موز|Peanut butter banana|244|6|28|12|
کره بادام‌زمینی و موز کم‌روغن|Peanut butter banana, low-oil|226|6|28|10|
پنیر لیقوان کم‌روغن|Ligvan cheese, low-oil|256|17|2|20|
پنیر محلی کم‌روغن|Local cheese, low-oil|248|16|1|20|
پنیر تبریزی با نان|Tabrizi cheese with bread|280|13|30|12|
پنیر تبریزی با نان کم‌روغن|Tabrizi cheese with bread, low-oil|262|13|30|10|
نان سنگک و کره و پنیر|Sangak butter cheese|302|10|34|14|
نان سنگک و کره و پنیر کم‌روغن|Sangak butter cheese, low-oil|284|10|34|12|
اشکنه صبحانه|Breakfast eshkeneh|124|5|8|8|
اشکنه صبحانه کم‌روغن|Breakfast eshkeneh, low-oil|106|5|8|6|
کشک و بادمجان|Kashk bademjan|112|4|6|8|
کشک و بادمجان کم‌روغن|Kashk bademjan, low-oil|94|4|6|6|
کله‌گنجشکی|Kalleh gonjeshki|207|8|10|15|
کله‌گنجشکی کم‌روغن|Kalleh gonjeshki, low-oil|189|8|10|13|
لبو|Labu|45|1|10|0.1|لبو چغندر
لبو با نمک|Labu with salt|45|1|10|0.1|
لبو با سس|Labu with sauce|61|1|12|1|
باقالی با سرکه و نمک|Baghali with vinegar|73|5|12|0.5|
باقالی با گشنیز|Baghali with coriander|73|5|12|0.6|
باقالی پخته با کره|Baghali with butter|104|5|12|4|
نخود لوبیا پخته|Cooked chickpeas beans|113|7|19|1|
لوبیا پخته|Cooked beans|110|7|19|0.7|
لپه شیرین|Sweet lapeh|178|6|34|2|
ذرت مکزیکی|Mexican corn|164|3.5|24|6|
ذرت پخته با نمک|Salted boiled corn|101|3.2|19|1.4|
بلال با کره|Corn with butter|137|3|20|5|
بلال با لیمو|Corn with lime|106|3|20|1.5|
سیب‌زمینی پخته با نمک|Boiled potato with salt|81|2|18|0.1|
کدو تنبل پخته|Baked pumpkin|33|1|7|0.1|
شلغم پخته با نمک|Salted boiled turnip|33|1|7|0.1|
گردو پخته|Cooked walnut|697|15|13|65|
چغاله بادام نمکی|Salted green almonds|53|5|6|1|
آلوچه با نمک|Plums with salt|55|1|12|0.3|
گوجه سبز با نمک|Green plum with salt|47|1|10|0.3|
تخم‌مرغ آب‌پز خیابانی|Street boiled egg|146|13|1|10|
تخم‌مرغ ترشی|Pickled egg|133|12|1|9|
سوسیس تنوری|Tanoori sausage|262|11|5|22|
ساندویچ املت|Omelet sandwich|247|9|28|11|
ساندویچ کوکو سبزی|Kuku sabzi sandwich|226|8|26|10|
ساندویچ کوکو سیب‌زمینی|Potato kuku sandwich|259|6|34|11|
ساندویچ عدسی|Adasi sandwich|181|6|28|5|
ساندویچ کتلت|Kotlet sandwich|264|11|28|12|
ساندویچ شامی|Shami sandwich|259|10|30|11|
ساندویچ جوجه کباب|Joojeh kabab sandwich|240|16|26|8|
ساندویچ ژامبون مرغ|Chicken ham sandwich|228|11|28|8|
ساندویچ زبان گوساله|Veal tongue sandwich|277|14|26|13|
ساندویچ هات‌داگ بندری|Hot dog Bandari|266|9|26|14|
ساندویچ سوسیس و تخم مرغ|Sausage egg sandwich|278|11|27|14|
ساندویچ میگو|Shrimp sandwich|232|12|28|8|
ساندویچ ناگت مرغ|Chicken nugget sandwich|272|11|30|12|
ساندویچ کوبیده با ریحان|Koobideh herb sandwich|277|13|27|13|
ساندویچ سیرابی|Sirabi sandwich|195|9|24|7|
ساندویچ دنده|Rib sandwich|286|14|26|14|
سیرابی‌شیردان با آب‌لیمو|Sirabi shirdan with lime|93|9|3|5|
سیب‌زمینی سرخ‌کرده با سس|Fries with sauce|266|3|32|14|
حلیم با نان خیابانی|Street haleem with bread|178|7|24|6|
آش رشته خیابانی|Street ash reshteh|76|3.6|10|2.4|
آش جو خیابانی|Street ash jo|70|3|10|2|
سیرابی کبابی|Grilled sirabi|128|12|2|8|
شیر برنج خیابانی|Street rice pudding|119|3|20|3|
فالوده خیابانی|Street faloodeh|109|1|24|1|
بستنی اکبر مشتی|Akbar mashti ice cream|220|4|24|12|
بستنی نان خامه‌ای|Bread cream ice cream|228|4|26|12|
بستنی وانیلی دکه ای|Street vanilla ice cream|191|3.5|24|9|
شربت بیدمشک|Bidmeshk sharbat|70|0.2|17|0.1|
شربت گل گاوزبان|Gol gavzaban sharbat|70|0.2|17|0.1|
شربت عسل و لیمو|Honey lemon sharbat|69|0.1|17|0.1|
شربت رز|Rose sharbat|73|0.1|18|0.1|
شربت به‌لیمو|Behlimoo sharbat|65|0.1|16|0.1|
شربت نعنا|Mint sharbat|65|0.1|16|0.1|
شربت زرشک|Barberry sharbat|70|0.2|17|0.1|
شربت شیره|Molasses sharbat|74|0.3|18|0.1|
شربت نارنج|Narenj sharbat|70|0.2|17|0.1|
شربت ریواس|Rivas sharbat|66|0.3|16|0.1|
دوغ سیاه‌دانه|Doogh with black seed|34|2|3|1.5|
دوغ با خیار|Doogh with cucumber|34|2|3|1.5|
ترشی سیر دو‌ساله|Aged garlic pickle|54|2|11|0.2|
ترشی سیر عسلی|Honeyed garlic pickle|70|2|15|0.2|
ترشی سیر شیرین|Sweet garlic pickle|74|2|16|0.2|
ترشی پیازچه|Scallion pickle|29|1|6|0.1|
ترشی بادمجان شکم پر|Stuffed eggplant pickle|66|1.5|6|4|
خیارشور ریز|Gherkin pickles|15|0.6|3|0.1|
خیارشور سرکه‌ای|Vinegar pickled cucumber|15|0.6|3|0.1|
فلفل ترشی|Pickled hot pepper|26|1|5|0.2|
فلفل شور|Salted pepper|26|1|5|0.2|
ترشی فلفل دلمه|Bell pepper pickle|26|1|5|0.2|
ترشی انبه سنتی|Traditional mango pickle|129|1|11|9|
ترشی انبه جنوبی|Southern mango pickle|138|1|11|10|
ترشی انبه با آبغوره|Mango pickle with verjuice|124|1|12|8|
ترشی انبه با سرکه|Mango pickle with vinegar|75|1|11|3|
ترشی میکس سبزیجات|Mixed vegetable pickle|33|1|6|0.5|
ترشی گوجه|Tomato pickle|20|0.8|4|0.1|
ترشی آلوچه|Cherry plum pickle|56|1|12|0.4|
ترشی به|Quince pickle|44|0.5|10|0.2|
ترشی انجیر|Fig pickle|65|1|14|0.5|
ترشی کنگر|Artichoke pickle|35|2|6|0.3|
ترشی ماست‌و‌خیار|Torshi mast khiar|59|3|5|3|
ترشی لیمو ترش|Sour lime pickle|31|1|6|0.3|
ترشی لیمو عمانی|Dried lime pickle|46|1|10|0.2|
ترشی سبزی خوردن|Sabzi khordan pickle|27|2|4|0.3|
ترشی ترخون|Tarragon pickle|31|2|5|0.3|
ترشی سرخ‌شده|Fried pickle|68|2|6|4|
ترشی شوید|Dill pickle|18|1|3|0.2|
ترشی گردو|Walnut pickle|342|8|10|30|
ترشی خرمالو|Persimmon pickle|61|0.8|14|0.2|
ترشی کنگر نمکی|Salted artichoke pickle|31|2|5|0.3|
ترشی سیب|Apple pickle|44|0.5|10|0.2|
ترشی سرکه کشمش|Raisin vinegar pickle|79|1|18|0.3|
ترشی ریحان|Basil pickle|29|2|4|0.5|
ترشی بامیه|Okra pickle|28|1.5|5|0.2|
ترشی کلم پیچ|Cabbage roll pickle|27|1.2|5|0.2|
ترشی لوبیا سبز|Green bean pickle|28|1.5|5|0.2|
ترشی شور|Torshi shoor|26|1|5|0.2|
شوری سبزیجات|Shoori vegetable brine|22|1|4|0.2|
شوری خیار|Shoori khiar|15|0.6|3|0.1|
شوری گل‌کلم|Shoori cauliflower|28|1.5|5|0.2|
شوری کلم|Shoori kalam|27|1.2|5|0.2|
شوری هویج|Shoori havij|32|0.8|7|0.1|
شوری بادمجان|Shoori bademjan|31|1|6|0.3|
شوری لیمو|Shoori limoo|31|1|6|0.3|
شوری سیر|Shoori sir|50|2|10|0.2|
شوری فلفل|Shoori felfel|26|1|5|0.2|
شوری گوجه|Shoori gojeh|20|0.8|4|0.1|
شوری شلغم|Shoori shalgham|25|1|5|0.1|
شوری چغندر|Shoori choghondar|37|1|8|0.1|
شوری زیتون|Shoori zeytoon|155|1|4|15|
شوری کرفس|Shoori karafs|22|1|4|0.2|
شوری پیاز|Shoori piaz|37|1|8|0.1|
شوری میکس|Shoori mixed|31|1|6|0.3|
شوری کنگر|Shoori kangar|31|2|5|0.3|
شوری ترب|Shoori torb|21|1|4|0.1|
شوری تربچه|Shoori torobcheh|16|0.8|3|0.1|
شوری قارچ|Shoori ghareh|23|2|3|0.3|
شوری کلم قرمز|Shoori red cabbage|27|1.2|5|0.2|
شوری کدو|Shoori kadoo|20|0.8|4|0.1|
سالاد شیرازی با آبلیمو|Shirazi salad with lime|42|0.8|4|2.5|
سالاد شیرازی با آبلیمو کم‌روغن|Shirazi salad with lime, low-oil|24|0.8|4|0.5|
سالاد شیرازی با آبلیمو با سس ماست|Shirazi salad with lime, with yogurt dressing|68|1.8|5|4.5|
سالاد شیرازی با آبغوره|Shirazi salad with verjuice|42|0.8|4|2.5|
سالاد شیرازی با آبغوره کم‌روغن|Shirazi salad with verjuice, low-oil|24|0.8|4|0.5|
سالاد شیرازی با آبغوره با سس ماست|Shirazi salad with verjuice, with yogurt dressing|68|1.8|5|4.5|
سالاد الویه مرغ|Olivieh with chicken|229|7|12|17|الویه
سالاد الویه مرغ کم‌روغن|Olivieh with chicken, low-oil|211|7|12|15|الویه
سالاد الویه مرغ با سس ماست|Olivieh with chicken, with yogurt dressing|255|8|13|19|الویه
سالاد الویه با گوشت|Olivieh with meat|225|7|11|17|
سالاد الویه با گوشت کم‌روغن|Olivieh with meat, low-oil|207|7|11|15|
سالاد الویه با گوشت با سس ماست|Olivieh with meat, with yogurt dressing|251|8|12|19|
سالاد الویه با ژامبون|Olivieh with ham|234|6|12|18|
سالاد الویه با ژامبون کم‌روغن|Olivieh with ham, low-oil|216|6|12|16|
سالاد الویه با ژامبون با سس ماست|Olivieh with ham, with yogurt dressing|260|7|13|20|
سالاد الویه کم‌چرب|Light olivieh|152|7|13|8|
سالاد الویه کم‌چرب کم‌روغن|Light olivieh, low-oil|134|7|13|6|
سالاد الویه کم‌چرب با سس ماست|Light olivieh, with yogurt dressing|178|8|14|10|
سالاد الویه شیرازی|Shirazi olivieh|216|6|12|16|
سالاد الویه شیرازی کم‌روغن|Shirazi olivieh, low-oil|198|6|12|14|
سالاد الویه شیرازی با سس ماست|Shirazi olivieh, with yogurt dressing|242|7|13|18|
سالاد الویه با ماست|Olivieh with yogurt|161|7|13|9|
سالاد الویه با ماست کم‌روغن|Olivieh with yogurt, low-oil|143|7|13|7|
سالاد الویه با ماست با سس ماست|Olivieh with yogurt, with yogurt dressing|187|8|14|11|
سالاد الویه گیاهی|Vegetarian olivieh|193|4|15|13|
سالاد الویه گیاهی کم‌روغن|Vegetarian olivieh, low-oil|175|4|15|11|
سالاد الویه گیاهی با سس ماست|Vegetarian olivieh, with yogurt dressing|219|5|16|15|
سالاد الویه با تخم‌مرغ زیاد|Egg-rich olivieh|225|8|10|17|
سالاد الویه با تخم‌مرغ زیاد کم‌روغن|Egg-rich olivieh, low-oil|207|8|10|15|
سالاد الویه با تخم‌مرغ زیاد با سس ماست|Egg-rich olivieh, with yogurt dressing|251|9|11|19|
سالاد ماکارونی کم‌روغن|Macaroni salad, low-oil|194|4|22|10|
سالاد ماکارونی با سس ماست|Macaroni salad, with yogurt dressing|238|5|23|14|
سالاد کلم کم‌روغن|Cabbage salad, low-oil|60|1|5|4|
سالاد کلم با سس ماست|Cabbage salad, with yogurt dressing|104|2|6|8|
سالاد کلم و هویج کم‌روغن|Cabbage carrot salad, low-oil|68|1|7|4|
سالاد کلم و هویج با سس ماست|Cabbage carrot salad, with yogurt dressing|112|2|8|8|
سالاد کلم با سس مایونز|Coleslaw with mayo|122|1|7|10|
سالاد کلم با سس مایونز کم‌روغن|Coleslaw with mayo, low-oil|104|1|7|8|
سالاد کلم با سس مایونز با سس ماست|Coleslaw with mayo, with yogurt dressing|148|2|8|12|
سالاد کاهو کم‌روغن|Lettuce salad, low-oil|34|1|3|2|
سالاد کاهو با سس ماست|Lettuce salad, with yogurt dressing|78|2|4|6|
سالاد کاهو با سرکه|Lettuce with vinegar|43|1|3|3|
سالاد کاهو با سرکه کم‌روغن|Lettuce with vinegar, low-oil|25|1|3|1|
سالاد کاهو با سرکه با سس ماست|Lettuce with vinegar, with yogurt dressing|69|2|4|5|
سالاد فصل کم‌روغن|Seasonal salad, low-oil|43|1.2|5|2|
سالاد فصل با سس ماست|Seasonal salad, with yogurt dressing|87|2.2|6|6|
سالاد خیار و گوجه کم‌روغن|Cucumber tomato salad, low-oil|28|0.8|4|1|
سالاد خیار و گوجه با سس ماست|Cucumber tomato salad, with yogurt dressing|72|1.8|5|5|
سالاد خیار و نعنا|Cucumber mint salad|42|0.8|3|3|
سالاد خیار و نعنا کم‌روغن|Cucumber mint salad, low-oil|24|0.8|3|1|
سالاد خیار و نعنا با سس ماست|Cucumber mint salad, with yogurt dressing|68|1.8|4|5|
سالاد خیار و ماست|Cucumber yogurt salad|55|3|4|3|
سالاد خیار و ماست کم‌روغن|Cucumber yogurt salad, low-oil|37|3|4|1|
سالاد خیار و ماست با سس ماست|Cucumber yogurt salad, with yogurt dressing|81|4|5|5|
سالاد چغندر کم‌روغن|Beet salad, low-oil|47|1.5|8|1|
سالاد چغندر با سس ماست|Beet salad, with yogurt dressing|91|2.5|9|5|
سالاد هویج|Carrot salad|67|1|9|3|
سالاد هویج کم‌روغن|Carrot salad, low-oil|49|1|9|1|
سالاد هویج با سس ماست|Carrot salad, with yogurt dressing|93|2|10|5|
سالاد سیب‌زمینی کم‌روغن|Potato salad, low-oil|127|2|14|7|
سالاد سیب‌زمینی با سس ماست|Potato salad, with yogurt dressing|171|3|15|11|
سالاد سیب‌زمینی با ماست|Potato yogurt salad|109|3|13|5|
سالاد سیب‌زمینی با ماست کم‌روغن|Potato yogurt salad, low-oil|91|3|13|3|
سالاد سیب‌زمینی با ماست با سس ماست|Potato yogurt salad, with yogurt dressing|135|4|14|7|
سالاد مرغ کم‌روغن|Chicken salad, low-oil|123|12|3|7|
سالاد مرغ با سس ماست|Chicken salad, with yogurt dressing|167|13|4|11|
سالاد ماهی تن|Tuna salad|128|11|3|8|
سالاد ماهی تن کم‌روغن|Tuna salad, low-oil|110|11|3|6|
سالاد ماهی تن با سس ماست|Tuna salad, with yogurt dressing|154|12|4|10|
سالاد بلغور کم‌روغن|Bulgur salad, low-oil|119|3|20|3|
سالاد بلغور با سس ماست|Bulgur salad, with yogurt dressing|163|4|21|7|
سالاد عدس کم‌روغن|Lentil salad, low-oil|110|7|16|2|
سالاد عدس با سس ماست|Lentil salad, with yogurt dressing|154|8|17|6|
سالاد لوبیا کم‌روغن|Bean salad, low-oil|102|6|15|2|
سالاد لوبیا با سس ماست|Bean salad, with yogurt dressing|146|7|16|6|
سالاد نخود کم‌روغن|Chickpea salad, low-oil|115|6|16|3|
سالاد نخود با سس ماست|Chickpea salad, with yogurt dressing|159|7|17|7|
سالاد ذرت|Corn salad|104|3|14|4|
سالاد ذرت کم‌روغن|Corn salad, low-oil|86|3|14|2|
سالاد ذرت با سس ماست|Corn salad, with yogurt dressing|130|4|15|6|
سالاد قارچ کم‌روغن|Mushroom salad, low-oil|51|3|3|3|
سالاد قارچ با سس ماست|Mushroom salad, with yogurt dressing|95|4|4|7|
سالاد انار|Pomegranate salad|88|1|12|4|
سالاد انار کم‌روغن|Pomegranate salad, low-oil|70|1|12|2|
سالاد انار با سس ماست|Pomegranate salad, with yogurt dressing|114|2|13|6|
سالاد پرتقال|Orange salad|71|1|10|3|
سالاد پرتقال کم‌روغن|Orange salad, low-oil|53|1|10|1|
سالاد پرتقال با سس ماست|Orange salad, with yogurt dressing|97|2|11|5|
سالاد فصل با گردو|Seasonal salad with walnut|122|3|5|10|
سالاد فصل با گردو کم‌روغن|Seasonal salad with walnut, low-oil|104|3|5|8|
سالاد فصل با گردو با سس ماست|Seasonal salad with walnut, with yogurt dressing|148|4|6|12|
سالاد ترب|Radish salad|47|1|4|3|
سالاد ترب کم‌روغن|Radish salad, low-oil|29|1|4|1|
سالاد ترب با سس ماست|Radish salad, with yogurt dressing|73|2|5|5|
سالاد کرفس|Celery salad|47|1|4|3|
سالاد کرفس کم‌روغن|Celery salad, low-oil|29|1|4|1|
سالاد کرفس با سس ماست|Celery salad, with yogurt dressing|73|2|5|5|
سالاد کرفس و سیب|Celery apple salad|67|1|9|3|
سالاد کرفس و سیب کم‌روغن|Celery apple salad, low-oil|49|1|9|1|
سالاد کرفس و سیب با سس ماست|Celery apple salad, with yogurt dressing|93|2|10|5|
سالاد سیب و گردو|Apple walnut salad|128|2|12|8|
سالاد سیب و گردو کم‌روغن|Apple walnut salad, low-oil|110|2|12|6|
سالاد سیب و گردو با سس ماست|Apple walnut salad, with yogurt dressing|154|3|13|10|
سالاد زیتون پرورده کم‌روغن|Zeytoon parvardeh salad, low-oil|146|2|12|10|
سالاد زیتون پرورده با سس ماست|Zeytoon parvardeh salad, with yogurt dressing|190|3|13|14|
سالاد شور|Shoor salad|51|1|5|3|
سالاد شور کم‌روغن|Shoor salad, low-oil|33|1|5|1|
سالاد شور با سس ماست|Shoor salad, with yogurt dressing|77|2|6|5|
سالاد تربچه|Torobcheh salad|43|1|3|3|
سالاد تربچه کم‌روغن|Torobcheh salad, low-oil|25|1|3|1|
سالاد تربچه با سس ماست|Torobcheh salad, with yogurt dressing|69|2|4|5|
سالاد کلم قرمز|Red cabbage salad|64|1|6|4|
سالاد کلم قرمز کم‌روغن|Red cabbage salad, low-oil|46|1|6|2|
سالاد کلم قرمز با سس ماست|Red cabbage salad, with yogurt dressing|90|2|7|6|
سالاد یونانی کم‌روغن|Greek salad, low-oil|95|3|5|7|
سالاد یونانی با سس ماست|Greek salad, with yogurt dressing|139|4|6|11|
سالاد سزار|Caesar salad|152|5|6|12|
سالاد سزار کم‌روغن|Caesar salad, low-oil|134|5|6|10|
سالاد سزار با سس ماست|Caesar salad, with yogurt dressing|178|6|7|14|
سالاد سبزیجات پخته|Cooked vegetable salad|68|2|6|4|
سالاد سبزیجات پخته کم‌روغن|Cooked vegetable salad, low-oil|50|2|6|2|
سالاد سبزیجات پخته با سس ماست|Cooked vegetable salad, with yogurt dressing|94|3|7|6|
سالاد بادمجان کم‌روغن|Eggplant salad, low-oil|86|2|6|6|
سالاد بادمجان با سس ماست|Eggplant salad, with yogurt dressing|130|3|7|10|
سالاد کدو|Zucchini salad|71|1.5|5|5|
سالاد کدو کم‌روغن|Zucchini salad, low-oil|53|1.5|5|3|
سالاد کدو با سس ماست|Zucchini salad, with yogurt dressing|97|2.5|6|7|
سالاد دلار|Dollar salad|56|1|4|4|
سالاد دلار کم‌روغن|Dollar salad, low-oil|38|1|4|2|
سالاد دلار با سس ماست|Dollar salad, with yogurt dressing|82|2|5|6|
سالاد ایتالیایی ایرانی|Persian Italian salad|158|3|14|10|
سالاد ایتالیایی ایرانی کم‌روغن|Persian Italian salad, low-oil|140|3|14|8|
سالاد ایتالیایی ایرانی با سس ماست|Persian Italian salad, with yogurt dressing|184|4|15|12|
ماست و خیار کم‌روغن|Mast o khiar, low-oil|42|3.2|5|1|
ماست و خیار با کشمش|Mast o khiar with raisin|76|3.3|9|3|
ماست و خیار با کشمش کم‌روغن|Mast o khiar with raisin, low-oil|58|3.3|9|1|
ماست و خیار با گردو|Mast o khiar with walnut|90|4|5|6|
ماست و خیار با گردو کم‌روغن|Mast o khiar with walnut, low-oil|72|4|5|4|
ماست و خیار با نعنا|Mast o khiar with mint|60|3.2|5|3|
ماست و خیار با نعنا کم‌روغن|Mast o khiar with mint, low-oil|42|3.2|5|1|
ماست و شوید کم‌روغن|Mast o shevid, low-oil|42|3.2|5|1|
ماست و موسیر کم‌روغن|Mast o musir, low-oil|42|3.2|5|1|
ماست و اسفناج کم‌روغن|Borani esfenaj, low-oil|54|4|5|2|
بورانی اسفناج کم‌روغن|Borani esfenaj dish, low-oil|54|4|5|2|
بورانی بادمجان کم‌روغن|Borani bademjan, low-oil|74|3.5|6|4|
بورانی کدو کم‌روغن|Borani kadoo, low-oil|56|3.5|6|2|
بورانی چغندر کم‌روغن|Borani choghondar, low-oil|56|3.5|7|1.5|
بورانی هویج|Borani havij|74|3.5|7|3.5|
بورانی هویج کم‌روغن|Borani havij, low-oil|56|3.5|7|1.5|
بورانی قارچ|Borani mushroom|72|4|5|4|
بورانی قارچ کم‌روغن|Borani mushroom, low-oil|54|4|5|2|
ماست و سبزی|Mast o sabzi|60|3.2|5|3|
ماست و سبزی کم‌روغن|Mast o sabzi, low-oil|42|3.2|5|1|
ماست چکیده با گردو|Strained yogurt with walnut|134|6|5|10|
ماست چکیده با گردو کم‌روغن|Strained yogurt with walnut, low-oil|116|6|5|8|
ماست چکیده و سیر|Strained yogurt garlic|98|6|5|6|
ماست چکیده و سیر کم‌روغن|Strained yogurt garlic, low-oil|80|6|5|4|
کشک بادمجان کم‌روغن|Low-oil kashk bademjan|85|4|6|5|
کشک بادمجان کم‌روغن کم‌روغن|Low-oil kashk bademjan, low-oil|67|4|6|3|
کشک کدو|Kashk kadoo|92|3.5|6|6|
کشک کدو کم‌روغن|Kashk kadoo, low-oil|74|3.5|6|4|
میرزا قاسمی کم‌روغن|Mirza ghasemi, low-oil|70|2.5|6|4|
میرزا قاسمی کم‌روغن کم‌روغن|Low-oil mirza ghasemi, low-oil|48|2.5|6|1.5|
میرزا قاسمی با تخم‌مرغ کم‌روغن|Mirza ghasemi with egg, low-oil|85|5|5|5|
میرزا قاسمی با سیر زیاد|Garlicky mirza ghasemi|90|3|6|6|
میرزا قاسمی با سیر زیاد کم‌روغن|Garlicky mirza ghasemi, low-oil|72|3|6|4|
نرگسی اسفناج با تخم‌مرغ|Nargesi spinach with egg|116|8|3|8|
نرگسی اسفناج با تخم‌مرغ کم‌روغن|Nargesi spinach with egg, low-oil|98|8|3|6|
نرگسی کدو|Nargesi kadoo|116|6|5|8|
نرگسی کدو کم‌روغن|Nargesi kadoo, low-oil|98|6|5|6|
نرگسی بادمجان|Nargesi bademjan|120|6|6|8|
نرگسی بادمجان کم‌روغن|Nargesi bademjan, low-oil|102|6|6|6|
حلیم بادمجان با کشک|Halim bademjan with kashk|99|3|6|7|
حلیم بادمجان با کشک کم‌روغن|Halim bademjan with kashk, low-oil|81|3|6|5|
خوراک بادمجان کم‌روغن|Bademjan khorak, low-oil|81|2|7|5|
خوراک کدو کم‌روغن|Kadoo khorak, low-oil|68|2|6|4|
خوراک لوبیا سبز کم‌روغن|Green bean khorak, low-oil|67|3|7|3|
خوراک لوبیا چیتی|Pinto bean khorak|107|6|14|3|
خوراک لوبیا چیتی کم‌روغن|Pinto bean khorak, low-oil|89|6|14|1|
خوراک لوبیا با گوشت|Bean khorak with meat|134|10|10|6|
خوراک لوبیا با گوشت کم‌روغن|Bean khorak with meat, low-oil|116|10|10|4|
خوراک لوبیا سفید|White bean khorak|107|6|14|3|
خوراک لوبیا سفید کم‌روغن|White bean khorak, low-oil|89|6|14|1|
خوراک نخود|Chickpea khorak|120|6|15|4|
خوراک نخود کم‌روغن|Chickpea khorak, low-oil|102|6|15|2|
خوراک عدس کم‌روغن|Lentil khorak, low-oil|89|6|14|1|
خوراک قارچ کم‌روغن|Mushroom khorak, low-oil|59|3|5|3|
خوراک مرغ کم‌روغن|Chicken khorak, low-oil|122|13|4|6|
خوراک مرغ و قارچ|Chicken mushroom khorak|140|13|4|8|
خوراک مرغ و قارچ کم‌روغن|Chicken mushroom khorak, low-oil|122|13|4|6|
خوراک مرغ و سبزیجات کم‌روغن|Chicken vegetable khorak, low-oil|104|11|6|4|
خوراک گوشت|Meat khorak|184|15|4|12|
خوراک گوشت کم‌روغن|Meat khorak, low-oil|166|15|4|10|
خوراک گوشت و سبزیجات|Meat vegetable khorak|157|13|6|9|
خوراک گوشت و سبزیجات کم‌روغن|Meat vegetable khorak, low-oil|139|13|6|7|
خوراک گوشت و قارچ|Meat mushroom khorak|166|14|5|10|
خوراک گوشت و قارچ کم‌روغن|Meat mushroom khorak, low-oil|148|14|5|8|
خوراک ماهی با سبزیجات|Fish vegetable khorak|117|13|5|5|
خوراک ماهی با سبزیجات کم‌روغن|Fish vegetable khorak, low-oil|99|13|5|3|
خوراک کتلت|Kotlet khorak|200|11|12|12|
خوراک کتلت کم‌روغن|Kotlet khorak, low-oil|182|11|12|10|
خوراک کوفته کم‌روغن|Kufteh khorak, low-oil|131|9|8|7|
خوراک لوبیا پلو|Lobia polo khorak|149|4|22|5|
خوراک لوبیا پلو کم‌روغن|Lobia polo khorak, low-oil|131|4|22|3|
خوراک سیب‌زمینی کم‌روغن|Potato khorak, low-oil|99|2|16|3|
خوراک اسفناج کم‌روغن|Spinach khorak, low-oil|46|3|4|2|
خوراک سبزیجات|Vegetable khorak|63|2|7|3|
خوراک سبزیجات کم‌روغن|Vegetable khorak, low-oil|45|2|7|1|
خوراک کدو و هویج|Squash carrot khorak|74|1.5|8|4|
خوراک کدو و هویج کم‌روغن|Squash carrot khorak, low-oil|56|1.5|8|2|
خوراک تخم‌مرغ کم‌روغن|Egg khorak, low-oil|115|9|4|7|
خوراک بلدرچین|Quail khorak|188|18|2|12|
خوراک بلدرچین کم‌روغن|Quail khorak, low-oil|170|18|2|10|
خوراک بوقلمون|Turkey khorak|134|17|3|6|
خوراک بوقلمون کم‌روغن|Turkey khorak, low-oil|116|17|3|4|
خوراک جوجه|Chick khorak|140|14|3|8|
خوراک جوجه کم‌روغن|Chick khorak, low-oil|122|14|3|6|
قلیه مرغ|Chicken ghalieh|131|11|6|7|
قلیه مرغ کم‌روغن|Chicken ghalieh, low-oil|113|11|6|5|
قلیه گوشت|Meat ghalieh|145|10|6|9|
قلیه گوشت کم‌روغن|Meat ghalieh, low-oil|127|10|6|7|
قلیه ماهی با تمر هندی|Ghalieh mahi tamarind|118|10|6|6|
قلیه ماهی با تمر هندی کم‌روغن|Ghalieh mahi tamarind, low-oil|100|10|6|4|
قلیه میگو با تمر هندی|Ghalieh meygoo tamarind|122|11|6|6|
قلیه میگو با تمر هندی کم‌روغن|Ghalieh meygoo tamarind, low-oil|104|11|6|4|
قلیه سبزی|Herb ghalieh|81|3|6|5|
قلیه سبزی کم‌روغن|Herb ghalieh, low-oil|63|3|6|3|
قلیه ماهی جنوبی|Southern fish ghalieh|114|10|5|6|
قلیه ماهی جنوبی کم‌روغن|Southern fish ghalieh, low-oil|96|10|5|4|
قلیه کباب|Ghalieh kabab|140|12|5|8|
قلیه کباب کم‌روغن|Ghalieh kabab, low-oil|122|12|5|6|
قلیه جگر|Liver ghalieh|144|12|6|8|
قلیه جگر کم‌روغن|Liver ghalieh, low-oil|126|12|6|6|
قلیه اسفناج|Spinach ghalieh|81|4|5|5|
قلیه اسفناج کم‌روغن|Spinach ghalieh, low-oil|63|4|5|3|
قلیه تره|Tareh ghalieh|81|4|5|5|
قلیه تره کم‌روغن|Tareh ghalieh, low-oil|63|4|5|3|
قلیه بادمجان|Bademjan ghalieh|90|3|6|6|
قلیه بادمجان کم‌روغن|Bademjan ghalieh, low-oil|72|3|6|4|
قلیه کدو|Kadoo ghalieh|90|3|6|6|
قلیه کدو کم‌روغن|Kadoo ghalieh, low-oil|72|3|6|4|
قلیه با شیر|Milk ghalieh|107|5|6|7|
قلیه با شیر کم‌روغن|Milk ghalieh, low-oil|89|5|6|5|
قلیه دل قلوه|Heart kidney ghalieh|140|12|5|8|
قلیه دل قلوه کم‌روغن|Heart kidney ghalieh, low-oil|122|12|5|6|
قلیه آلو|Prune ghalieh|105|3|12|5|
قلیه آلو کم‌روغن|Prune ghalieh, low-oil|87|3|12|3|
نان تافتون کامل|Whole taftoon|254|10|50|1.5|
نان جو سنگک|Barley sangak|246|9|48|2|
نان محلی|Local bread|262|9|52|2|
نان تنوری|Tanoori bread|258|9|52|1.5|
نان فطیر|Fatir bread|318|7|50|10|
نان گندم کامل|Whole wheat bread|242|11|45|2|
نان ماشین|Machine bread|254|9|50|2|
نان تکه ای|Pieced bread|262|9|52|2|
نان خرما|Date bread|304|6|52|8|
نان سیاه|Black bread|246|9|48|2|
نان لواش کم‌نمک|Low-salt lavash|265|9|55|1|
`;
export const IRANIAN2 = A + B;
