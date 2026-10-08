// کد رسمی نماد اعتماد الکترونیکی — دقیقا همون snippetی که پنل اینماد
// برای این سایت صادر کرده (id/Code مخصوص این دامنه‌ست، دست‌کاری نکن).
// alt رو (برخلاف خروجی خام اینماد که alt='' می‌ده) یه متن معنادار گذاشتم
// چون این تصویر محتوایی/اعتمادسازه، نه تزئینی — برای اسکرین‌ریدر باید
// خونده بشه.
export function EnamadBadge() {
  return (
    <a
      referrerPolicy="origin"
      target="_blank"
      rel="noopener"
      href="https://trustseal.enamad.ir/?id=7422181&Code=pq9jwdSFVxQnPZsFD15gTuWGn4q37IIc"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        referrerPolicy="origin"
        src="https://trustseal.enamad.ir/logo.aspx?id=7422181&Code=pq9jwdSFVxQnPZsFD15gTuWGn4q37IIc"
        alt="نماد اعتماد الکترونیکی"
        style={{ cursor: "pointer" }}
      />
    </a>
  );
}
