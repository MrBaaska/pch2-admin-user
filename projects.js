/**
 * projects.js
 * ----------------------------------------------------------------
 * ЭНЭ ФАЙЛ БОЛ ЦОРЫН ГАНЦ КОНФИГУРАЦИЙН ГАЗАР.
 *
 * 20 (ирээдүйд 30, 40...) project-ийн мэдээллийг зөвхөн ЭНД засварлана.
 * HTML, CSS, эсвэл app.js-д ХҮРЭХ ШААРДЛАГАГҮЙ.
 *
 * Талбаруудын тайлбар:
 *   id          - тоон дугаар (картын дугаар, эрэмбэ)
 *   name        - хэсгийн товч нэр
 *   description - картан дээр харагдах товч тайлбар (1-2 өгүүлбэр)
 *   url         - тухайн project-ийн GitHub Pages хаяг (заавал "/"-ээр төгссөн байх)
 *   icon        - картны icon (emoji эсвэл SVG нэр, доор iconLibrary-с сонгоно)
 *   status      - "active" | "inactive" | "maintenance"
 *   category    - (сонголт) ирээдүйд бүлэглэхэд ашиглаж болно
 *
 * ЧУХАЛ: url талбарыг зөв бөглөнө үү. Доорх жагсаалтад зөвхөн эхний
 * гурван URL (1, 2, 3) нь баталгаажсан бодит холбоос. Үлдсэн 4-20-ыг
 * "https://mrbaaska.github.io/pd-N-1/" загвараар таамаглан бөглөсөн
 * тул ЗААВАЛ шалгаж, зөв URL-ээр солино уу.
 * ----------------------------------------------------------------
 */

const projects = [
  {
    id: 1,
    name: "1-р хэсэг",
    description: "Замын 1-р хэсгийн ажилтан, ХАБЭА, ГТХАБ бүртгэлийн систем.",
    url: "https://mrbaaska.github.io/pd-1-1/",
    icon: "rail",
    status: "active",
  },
  {
    id: 2,
    name: "2-р хэсэг",
    description: "Замын 2-р хэсгийн ажилтан, ХАБЭА, ГТХАБ бүртгэлийн систем.",
    url: "https://mrbaaska.github.io/pd-2-1/",
    icon: "rail",
    status: "active",
  },
  {
    id: 3,
    name: "3-р хэсэг",
    description: "Замын 3-р хэсгийн ажилтан, ХАБЭА, ГТХАБ бүртгэлийн систем.",
    url: "https://mrbaaska.github.io/pd-3-1/",
    icon: "rail",
    status: "active",
  },
  { id: 4,  name: "4-р хэсэг",  description: "Замын 4-р хэсгийн бүртгэлийн систем.",  url: "https://mrbaaska.github.io/pd-4-1/",  icon: "rail", status: "active" },
  { id: 5,  name: "5-р хэсэг",  description: "Замын 5-р хэсгийн бүртгэлийн систем.",  url: "https://mrbaaska.github.io/pd-5-1/",  icon: "rail", status: "active" },
  { id: 6,  name: "6-р хэсэг",  description: "Замын 6-р хэсгийн бүртгэлийн систем.",  url: "https://mrbaaska.github.io/pd-6-1/",  icon: "rail", status: "active" },
  { id: 7,  name: "7-р хэсэг",  description: "Замын 7-р хэсгийн бүртгэлийн систем.",  url: "https://mrbaaska.github.io/pd-7-1/",  icon: "rail", status: "active" },
  { id: 8,  name: "8-р хэсэг",  description: "Замын 8-р хэсгийн бүртгэлийн систем.",  url: "https://mrbaaska.github.io/pd-8-1/",  icon: "rail", status: "active" },
  { id: 9,  name: "9-р хэсэг",  description: "Замын 9-р хэсгийн бүртгэлийн систем.",  url: "https://mrbaaska.github.io/pd-9-1/",  icon: "rail", status: "active" },
  { id: 10, name: "10-р хэсэг", description: "Замын 10-р хэсгийн бүртгэлийн систем.", url: "https://mrbaaska.github.io/pd-10-1/", icon: "rail", status: "active" },
  { id: 11, name: "11-р хэсэг", description: "Замын 11-р хэсгийн бүртгэлийн систем.", url: "https://mrbaaska.github.io/pd-11-1/", icon: "rail", status: "active" },
  { id: 12, name: "12-р хэсэг", description: "Замын 12-р хэсгийн бүртгэлийн систем.", url: "https://mrbaaska.github.io/pd-12-1/", icon: "rail", status: "active" },
  { id: 13, name: "13-р хэсэг", description: "Замын 13-р хэсгийн бүртгэлийн систем.", url: "https://mrbaaska.github.io/pd-13-1/", icon: "rail", status: "active" },
  { id: 14, name: "14-р хэсэг", description: "Замын 14-р хэсгийн бүртгэлийн систем.", url: "https://mrbaaska.github.io/pd-14-1/", icon: "rail", status: "active" },
  { id: 15, name: "15-р хэсэг", description: "Замын 15-р хэсгийн бүртгэлийн систем.", url: "https://mrbaaska.github.io/pd-15-1/", icon: "rail", status: "active" },
  { id: 16, name: "16-р хэсэг", description: "Замын 16-р хэсгийн бүртгэлийн систем.", url: "https://mrbaaska.github.io/pd-16-1/", icon: "rail", status: "active" },
  { id: 17, name: "17-р хэсэг", description: "Замын 17-р хэсгийн бүртгэлийн систем.", url: "https://mrbaaska.github.io/pd-17-1/", icon: "rail", status: "active" },
  { id: 18, name: "18-р хэсэг", description: "Замын 18-р хэсгийн бүртгэлийн систем.", url: "https://mrbaaska.github.io/pd-18-1/", icon: "rail", status: "active" },
  { id: 19, name: "19-р хэсэг", description: "Замын 19-р хэсгийн бүртгэлийн систем.", url: "https://mrbaaska.github.io/pd-19-1/", icon: "rail", status: "active" },
  { id: 20, name: "20-р хэсэг", description: "Замын 20-р хэсгийн бүртгэлийн систем.", url: "https://mrbaaska.github.io/pd-20-1/", icon: "rail", status: "active" },
];

/**
 * Шинэ project нэмэхдээ дараах маягтыг ашиглан массивт нэг мөр нэмнэ:
 *
 * { id: 21, name: "21-р хэсэг", description: "...", url: "https://.../", icon: "rail", status: "active" },
 *
 * Өөр юу ч засах шаардлагагүй — Dashboard тоолуур, хайлт, шүүлтүүр
 * бүгд автоматаар шинэчлэгдэнэ.
 */

// Node.js орчинд export хийх боломж (заавал биш, GitHub Pages дээр хэрэггүй)
if (typeof module !== "undefined" && module.exports) {
  module.exports = projects;
}