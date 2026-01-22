import { XCircle, ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/navigation";

export default async function CheckoutCancel({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await params;
  const t = await getTranslations("Checkout");

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-full bg-stone-100">
          <XCircle className="w-8 h-8 text-stone-500" />
        </div>

        <h1 className="text-2xl font-semibold text-stone-900 mb-3">
          {t("cancel_title")}
        </h1>

        <p className="text-stone-600 mb-8">{t("cancel_description")}</p>

        <div className="space-y-3">
          <Link
            href="/wizard"
            className="w-full inline-flex items-center justify-center gap-2 bg-stone-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-stone-800 transition-colors"
          >
            <ArrowLeft size={16} className="rtl:rotate-180" />
            <span>{t("back_to_wizard")}</span>
          </Link>

          <p className="text-xs text-stone-500">{t("cancel_note")}</p>
        </div>
      </div>
    </div>
  );
}
