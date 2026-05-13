import { z } from "zod";
import type { TemplateDefinition } from "../types";
import { composeDeclaration } from "./compose";

const nonEmpty = (label: string) => z.string().trim().min(1, `${label}: обязательное поле`);

export const declarationEaeuLightSchema = z.object({
  // Заявитель
  applicant_full_name: nonEmpty("Полное наименование заявителя"),
  applicant_okpo: nonEmpty("ОКПО"),
  applicant_inn: nonEmpty("ИНН"),
  applicant_country: nonEmpty("Страна заявителя"),
  applicant_address: nonEmpty("Адрес заявителя"),
  applicant_phone: nonEmpty("Телефон"),
  applicant_email: z.string().trim().email("Некорректный email"),
  applicant_signatory: nonEmpty("ФИО подписанта"),

  // Изготовитель
  manufacturer_full_name: nonEmpty("Наименование изготовителя"),
  manufacturer_country: nonEmpty("Страна изготовителя"),
  manufacturer_address: nonEmpty("Адрес изготовителя"),

  // Товары — список позиций
  products: z
    .array(
      z.object({
        production_type: z.enum(["woven", "knit"]).default("woven"),
        product_name: nonEmpty("Наименование позиции"),
        product_composition: nonEmpty("Состав / характеристики"),
        gender_hint: z.enum(["auto", "women", "men", "kids", "adults"]).default("auto"),
        tn_ved_code: nonEmpty("Код ТН ВЭД"),
      }),
    )
    .min(1, "Добавьте хотя бы одну позицию товара"),

  // Продукция — авто-вычисляемое описание + ввод бренда
  brand_name: nonEmpty("Торговая марка"),
  // Auto-derived; user can override product_group_description manually.
  product_group_description: z.string().trim().min(1, "Описание группы продукции пустое — заполните товары"),
  // Internal/computed — set by derive(), not exposed in form UI
  product_group_intro: z.string().default(""),
  gost_references_block: z.string().default(""),
  has_appendix: z.string().default(""),
  kod_tn_ved_line: z.string().default(""),
});

export type DeclarationEaeuLightData = z.infer<typeof declarationEaeuLightSchema>;

export const declarationEaeuLight: TemplateDefinition = {
  slug: "declaration-eaeu-light",
  title: "Декларация о соответствии ЕАЭС (ТР ТС 017/2011 — лёгкая промышленность)",
  description:
    "Декларация о соответствии Евразийского экономического союза для продукции лёгкой промышленности " +
    "(одежда, изделия второго слоя). Регулируется ТР ТС 017/2011.",
  docxPath: "templates/declaration-eaeu-light/template.docx",
  schema: declarationEaeuLightSchema,
  derivedFields: ["product_group_description"],
  derive: (data) =>
    composeDeclaration({
      products: (data.products as Array<Record<string, string>>) ?? [],
      brand_name: typeof data.brand_name === "string" ? data.brand_name : "",
    }),
  sections: [
    {
      title: "Заявитель",
      description: "Юридическое лицо или ИП, подающее декларацию",
      fields: [
        {
          name: "applicant_full_name",
          label: "Полное наименование",
          kind: "text",
          placeholder: "Индивидуальный предприниматель Иванов Иван Иванович",
        },
        { name: "applicant_okpo", label: "ОКПО", kind: "text", placeholder: "33251958" },
        { name: "applicant_inn", label: "ИНН", kind: "text", placeholder: "12903197400363" },
        { name: "applicant_country", label: "Страна", kind: "text", placeholder: "Кыргызская Республика" },
        {
          name: "applicant_address",
          label: "Адрес (юридический и фактический)",
          kind: "textarea",
          placeholder: "Чуйская область, Первомайский район, проспект Жибек-Жолу, дом 462а",
        },
        {
          name: "applicant_phone",
          label: "Телефон (без +)",
          kind: "tel",
          placeholder: "996500624001",
          help: "Цифры без знака плюс. Плюс будет добавлен в документе автоматически.",
        },
        { name: "applicant_email", label: "Email", kind: "email", placeholder: "name@example.com" },
        {
          name: "applicant_signatory",
          label: "ФИО подписанта",
          kind: "text",
          placeholder: "Иванов Иван Иванович",
          help: "Лицо, действующее от имени заявителя",
        },
      ],
    },
    {
      title: "Изготовитель",
      description: "Если совпадает с заявителем — продублируйте данные",
      fields: [
        { name: "manufacturer_full_name", label: "Наименование изготовителя", kind: "text" },
        { name: "manufacturer_country", label: "Страна", kind: "text" },
        { name: "manufacturer_address", label: "Адрес", kind: "textarea" },
      ],
    },
    {
      title: "Товары",
      description: "По каждой позиции — код ТН ВЭД, название, состав",
      fields: [
        {
          name: "products",
          label: "Список товаров",
          kind: "list",
          itemLabel: "Позиция",
          addButtonLabel: "Добавить позицию",
          minItems: 1,
          itemFields: [
            {
              name: "production_type",
              label: "Тип изделия",
              kind: "select",
              options: [
                { value: "woven", label: "Швейное (из ткани)" },
                { value: "knit", label: "Трикотажное" },
              ],
            },
            {
              name: "gender_hint",
              label: "Для кого",
              kind: "select",
              options: [
                { value: "auto", label: "Авто (по названию)" },
                { value: "women", label: "Для женщин" },
                { value: "men", label: "Для мужчин" },
                { value: "kids", label: "Для детей" },
                { value: "adults", label: "Для взрослых" },
              ],
            },
            { name: "product_name", label: "Наименование", kind: "text", placeholder: "Платья" },
            {
              name: "product_composition",
              label: "Состав / характеристики",
              kind: "text",
              placeholder: "(состав: полиэстер 80%, вискоза 15%, эластан 5%)",
            },
            {
              name: "tn_ved_code",
              label: "Код ТН ВЭД",
              kind: "text",
              placeholder: "Заполнится автоматически",
              derived: true,
              help: "Подбирается автоматически по справочнику ЕАЭС из типа, наименования, пола и состава. Если знаете точный 10-значный код — можете ввести его сами поверх предложенного: система не перезапишет ваш ввод.",
            },
          ],
        },
      ],
    },
    {
      title: "Продукция",
      description: "Бренд и описание группы. Описание вычисляется автоматически по списку товаров — при желании можно отредактировать.",
      fields: [
        {
          name: "brand_name",
          label: "Торговая марка",
          kind: "text",
          placeholder: "Фарида мода",
          help: "Только название бренда, без кавычек — они будут добавлены автоматически",
        },
        {
          name: "product_group_description",
          label: "Описание группы продукции (автоматически)",
          kind: "textarea",
          help: "Заполняется автоматически по списку товаров и бренду. Можно отредактировать вручную, если автологика что-то не угадала.",
        },
      ],
    },
  ],
  adminMetadata: [
    { name: "registration_no", label: "Регистрационный номер декларации", kind: "text" },
    { name: "registered_at", label: "Дата регистрации", kind: "date" },
    { name: "valid_until", label: "Действительна до (включительно)", kind: "date" },
    { name: "protocol_no", label: "Номер протокола испытаний", kind: "text" },
  ],
};
