import { useEffect } from "react";

interface MailerLiteFormProps {
  onSubmit?: () => void;
}

export default function MailerLiteForm({ onSubmit }: MailerLiteFormProps) {
  useEffect(() => {
    // Load MailerLite scripts
    const script1 = document.createElement("script");
    script1.src =
      "https://groot.mailerlite.com/js/w/webforms.min.js?v176e10baa5e7ed80d35ae235be3d5024";
    script1.type = "text/javascript";
    document.body.appendChild(script1);

    const script2 = document.createElement("script");
    script2.innerHTML = `(async () => { try { await fetch("https://assets.mailerlite.com/jsonp/1955610/forms/172579220566837150/takel"); } catch (e) { /* ignore fetch errors */ } })()`;
    document.body.appendChild(script2);

    // Add form submission handler
    const form = document.querySelector(".ml-block-form") as HTMLFormElement;
    if (form) {
      const handleSubmit = (e: Event) => {
        e.preventDefault();

        // -------------------------
        // 1) generate unique event id (persisted for the session)
        // -------------------------
        let eventId = sessionStorage.getItem("capi_event_id");
        if (!eventId) {
          eventId = "evt-" + Date.now().toString(36);
          try {
            sessionStorage.setItem("capi_event_id", eventId);
          } catch (err) {
            // sessionStorage may throw if user blocks storage — ignore
          }
        }

        // Build FormData once
        const formData = new FormData(form);

        // Try to extract email (robustly: several possible field names)
        const getEmailFromForm = () => {
          const emailInput = form.querySelector(
            'input[type="email"]',
          ) as HTMLInputElement | null;
          if (emailInput && emailInput.value) return emailInput.value.trim();

          const fdEmail = formData.get("email");
          if (fdEmail && typeof fdEmail === "string") return fdEmail.trim();

          const fdAlt =
            formData.get("fields[email]") || formData.get("fields%5Bemail%5D");
          if (fdAlt && typeof fdAlt === "string") return fdAlt.trim();

          const named = form.querySelector(
            'input[name*="email"]',
          ) as HTMLInputElement | null;
          if (named && named.value) return named.value.trim();

          return null;
        };

        const userEmail = getEmailFromForm();
        const phoneInput = form.querySelector(
          'input[type="tel"], input[name*="phone"]',
        ) as HTMLInputElement | null;
        const userPhone =
          phoneInput && phoneInput.value ? phoneInput.value.trim() : null;

        // -------------------------
        // 2) Submit form data to MailerLite (existing behaviour)
        // -------------------------
        fetch(
          "https://assets.mailerlite.com/jsonp/1955610/forms/172579220566837150/subscribe",
          {
            method: "POST",
            body: formData,
          },
        )
          .then(async () => {
            // Show success message (same as before)
            try {
              const successBody = document.querySelector(
                ".ml-form-successBody",
              ) as HTMLElement;
              const formBody = document.querySelector(
                ".ml-form-embedBodyDefault",
              ) as HTMLElement;
              if (successBody && formBody) {
                successBody.style.display = "block";
                formBody.style.display = "none";
              }
            } catch (err) {
              console.warn("success UI update failed", err);
            }

            // Increment waitlist count callback
            if (onSubmit) onSubmit();

            // --- Now emit tracking (after successful subscribe) ---

            // 3) dataLayer push for GTM (optional)
            try {
              (window as any).dataLayer = (window as any).dataLayer || [];
              (window as any).dataLayer.push({
                event: "submit_application",
                event_id: eventId,
                content_name: "claim_3_months_free",
              });
            } catch (err) {
              console.warn("dataLayer push failed", err);
            }

            // 4) Fire Meta pixel (client) — unchanged
            try {
              if (typeof (window as any).fbq === "function") {
                (window as any).fbq(
                  "track",
                  "submit application",
                  { content_name: "claim_3_months_free", event_id: eventId },
                  { eventID: eventId },
                );
              } else {
                console.warn("fbq not found on page");
              }
            } catch (err) {
              console.warn("fbq track error", err);
            }

            // 5) Fire TikTok browser pixel (client)
            try {
              if (
                typeof (window as any).ttq === "object" &&
                typeof (window as any).ttq.track === "function"
              ) {
                (window as any).ttq.track("Join the waitlist", {
                  event_id: eventId,
                  page_url: window.location.href,
                  content_name: "claim_3_months_free",
                });
              } else {
                console.warn("ttq not found on page");
              }
            } catch (err) {
              console.warn("ttq track error", err);
            }

            // 6) Server-side event: call Netlify function to forward to TikTok Events API
            try {
              const hostname = window.location.hostname;
              const isProduction =
                hostname === "unbakedapp.com" ||
                hostname === "www.unbakedapp.com";

              if (isProduction) {
                const params = new URLSearchParams(window.location.search);
                const ttclid = params.get("ttclid");
                const ttp = params.get("ttp");

                const serverPayload = {
                  event_name: "Join the waitlist",
                  event_id: eventId,
                  email: userEmail || null,
                  phone: userPhone || null,
                  page_url: window.location.href,
                  content_id: "waitlist_button",
                  content_type: "waitlist",
                  content_name: "claim_3_months_free",
                  ttclid: ttclid || null,
                  ttp: ttp || null,
                };

                fetch("/.netlify/functions/track-tiktok", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(serverPayload),
                })
                  .then((res) => {
                    if (!res.ok) {
                      console.warn(
                        "Server tracking call failed",
                        res.statusText,
                      );
                    }
                  })
                  .catch((err) => {
                    console.warn("Server tracking error", err);
                  });
              } else {
                console.log(
                  "TikTok Conversions API: Skipped on non-production domain",
                );
              }
            } catch (err) {
              console.warn("server event call error", err);
            }

            // --- Server-side event: call Netlify function to forward to Meta Conversions API ---
            try {
              const hostname = window.location.hostname;
              const isProduction =
                hostname === "unbakedapp.com" ||
                hostname === "www.unbakedapp.com";

              if (isProduction) {
                const getCookie = (name: string): string | null => {
                  const m = document.cookie.match(
                    "(^|;)\\s*" + name + "\\s*=\\s*([^;]+)",
                  );
                  return m ? (m.pop() as string) : null;
                };

                const fbp = getCookie("_fbp") || null;
                const fbc = getCookie("_fbc") || null;

                const metaPayload = {
                  event_name: "submit application",
                  event_id: eventId,
                  email: userEmail || null,
                  fbp,
                  fbc,
                  page_url: window.location.href,
                  custom_data: { content_name: "claim_3_months_free" },
                };

                fetch("/.netlify/functions/meta-capi", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(metaPayload),
                })
                  .then((res) => {
                    if (!res.ok) {
                      res
                        .text()
                        .then((txt) =>
                          console.warn(
                            "Meta CAPI server call failed",
                            res.status,
                            txt,
                          ),
                        )
                        .catch(() => {});
                    }
                  })
                  .catch((err) => {
                    console.warn("Meta CAPI server call error", err);
                  });
              } else {
                console.log(
                  "Meta Conversions API: Skipped on non-production domain",
                );
              }
            } catch (err) {
              console.warn("meta server call setup error", err);
            }
          })
          .catch((error) => {
            console.error("Form submission error:", error);
          });
      };

      form.addEventListener("submit", handleSubmit);

      return () => {
        form.removeEventListener("submit", handleSubmit);
        if (script1.parentNode) script1.parentNode.removeChild(script1);
        if (script2.parentNode) script2.parentNode.removeChild(script2);
      };
    }

    return () => {
      if (script1.parentNode) script1.parentNode.removeChild(script1);
      if (script2.parentNode) script2.parentNode.removeChild(script2);
    };
  }, [onSubmit]);

  return (
    <div>
      <style>{`
        @import url("https://assets.mlcdn.com/fonts.css?version=1762785");

        .ml-form-embedSubmitLoad {
          display: inline-block;
          width: 20px;
          height: 20px;
        }

        .g-recaptcha {
          transform: scale(1);
          -webkit-transform: scale(1);
          transform-origin: 0 0;
          -webkit-transform-origin: 0 0;
          height: ;
        }

        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0,0,0,0);
          border: 0;
        }

        .ml-form-embedSubmitLoad:after {
          content: " ";
          display: block;
          width: 11px;
          height: 11px;
          margin: 1px;
          border-radius: 50%;
          border: 4px solid #fff;
          border-color: #000000 #000000 #000000 transparent;
          animation: ml-form-embedSubmitLoad 1.2s linear infinite;
        }

        @keyframes ml-form-embedSubmitLoad {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        #mlb2-34057365.ml-form-embedContainer {
          box-sizing: border-box;
          display: table;
          margin: 0 auto;
          position: static;
          width: 100% !important;
        }

        #mlb2-34057365.ml-form-embedContainer h4,
        #mlb2-34057365.ml-form-embedContainer p,
        #mlb2-34057365.ml-form-embedContainer span,
        #mlb2-34057365.ml-form-embedContainer button {
          text-transform: none !important;
          letter-spacing: normal !important;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper {
          background-color: #000000;
          border-width: 0px;
          border-color: transparent;
          border-radius: 17px;
          border-style: solid;
          box-sizing: border-box;
          display: inline-block !important;
          margin: 0;
          padding: 0;
          position: relative;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper.embedPopup,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper.embedDefault {
          width: 400px;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper.embedForm {
          max-width: 400px;
          width: 100%;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-align-left {
          text-align: left;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-align-center {
          text-align: center;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-align-default {
          display: table-cell !important;
          vertical-align: middle !important;
          text-align: center !important;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-align-right {
          text-align: right;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedHeader img {
          border-top-left-radius: 17px;
          border-top-right-radius: 17px;
          height: auto;
          margin: 0 auto !important;
          max-width: 100%;
          width: undefinedpx;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-successBody {
          padding: 20px 20px 0 20px;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody.ml-form-embedBodyHorizontal {
          padding-bottom: 0;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedContent,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-successBody .ml-form-successContent {
          text-align: left;
          margin: 0 0 10px 0;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedContent h4,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-successBody .ml-form-successContent h4 {
          color: #ffffff;
          font-family: 'Poppins', sans-serif;
          font-size: 25px;
          font-weight: 700;
          margin: 0 0 20px 0;
          text-align: center;
          word-break: break-word;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedContent p {
          color: #000000;
          font-family: 'Poppins', sans-serif;
          font-size: 10px;
          font-weight: 400;
          line-height: 16px;
          margin: 0 0 10px 0;
          text-align: center;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-successBody .ml-form-successContent p {
          color: #ffffff;
          font-family: 'Poppins', sans-serif;
          font-size: 10px;
          font-weight: 400;
          line-height: 16px;
          margin: 0 0 10px 0;
          text-align: center;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedContent ul,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedContent ol,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-successBody .ml-form-successContent ul,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-successBody .ml-form-successContent ol {
          color: #000000;
          font-family: 'Poppins', sans-serif;
          font-size: 10px;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedContent ol ol,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-successBody .ml-form-successContent ol ol {
          list-style-type: lower-alpha;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedContent ol ol ol,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-successBody .ml-form-successContent ol ol ol {
          list-style-type: lower-roman;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedContent p a,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-successBody .ml-form-successContent p a {
          color: #000000;
          text-decoration: underline;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-block-form .ml-field-group {
          text-align: left!important;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-block-form .ml-field-group label {
          margin-bottom: 5px;
          color: #ffffff;
          font-size: 14px;
          font-family: 'Poppins', sans-serif;
          font-weight: bold;
          font-style: normal;
          text-decoration: none;
          display: inline-block;
          line-height: 20px;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedContent p:last-child,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-successBody .ml-form-successContent p:last-child {
          margin: 0;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody form {
          margin: 0;
          width: 100%;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-formContent,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-checkboxRow {
          margin: 0 0 20px 0;
          width: 100%;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-checkboxRow {
          float: left;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-formContent.horozintalForm {
          margin: 0;
          padding: 0 0 20px 0;
          width: 100%;
          height: auto;
          float: left;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow {
          margin: 0 0 10px 0;
          width: 100%;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow.ml-last-item {
          margin: 0;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow.ml-formfieldHorizintal {
          margin: 0;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow input {
          background-color: #1a1a1a !important;
          color: #a8b2c1 !important;
          border-color: #2f2f2f;
          border-radius: 25px !important;
          border-style: solid !important;
          border-width: 1px !important;
          font-family: 'Poppins', sans-serif;
          font-size: 14px !important;
          height: auto;
          line-height: 21px !important;
          margin-bottom: 0;
          margin-top: 0;
          margin-left: 0;
          margin-right: 0;
          padding: 10px 10px !important;
          width: 100% !important;
          box-sizing: border-box !important;
          max-width: 100% !important;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow input::-webkit-input-placeholder,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-horizontalRow input::-webkit-input-placeholder {
          color: #a8b2c1;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow input::-moz-placeholder,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-horizontalRow input::-moz-placeholder {
          color: #a8b2c1;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow input:-ms-input-placeholder,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-horizontalRow input:-ms-input-placeholder {
          color: #a8b2c1;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow input:-moz-placeholder,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-horizontalRow input:-moz-placeholder {
          color: #a8b2c1;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow textarea,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-horizontalRow textarea {
          background-color: #1a1a1a !important;
          color: #a8b2c1 !important;
          border-color: #2f2f2f;
          border-radius: 25px !important;
          border-style: solid !important;
          border-width: 1px !important;
          font-family: 'Poppins', sans-serif;
          font-size: 14px !important;
          height: auto;
          line-height: 21px !important;
          margin-bottom: 0;
          margin-top: 0;
          padding: 10px 10px !important;
          width: 100% !important;
          box-sizing: border-box !important;
          max-width: 100% !important;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow .custom-radio .custom-control-label::before,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-horizontalRow .custom-radio .custom-control-label::before,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow .custom-checkbox .custom-control-label::before,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-horizontalRow .custom-checkbox .custom-control-label::before,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedPermissions .ml-form-embedPermissionsOptionsCheckbox .label-description::before,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-interestGroupsRow .ml-form-interestGroupsRowCheckbox .label-description::before,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-checkboxRow .label-description::before {
          border-color: #2f2f2f!important;
          background-color: #1a1a1a!important;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow input.custom-control-input[type="checkbox"] {
          box-sizing: border-box;
          padding: 0;
          position: absolute;
          z-index: -1;
          opacity: 0;
          margin-top: 5px;
          margin-left: -1.5rem;
          overflow: visible;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow .custom-checkbox .custom-control-label::before,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-horizontalRow .custom-checkbox .custom-control-label::before,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedPermissions .ml-form-embedPermissionsOptionsCheckbox .label-description::before,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-interestGroupsRow .ml-form-interestGroupsRowCheckbox .label-description::before,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-checkboxRow .label-description::before {
          border-radius: 4px!important;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-checkboxRow input[type=checkbox]:checked~.label-description::after,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedPermissions .ml-form-embedPermissionsOptionsCheckbox input[type=checkbox]:checked~.label-description::after,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow .custom-checkbox .custom-control-input:checked~.custom-control-label::after,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-horizontalRow .custom-checkbox .custom-control-input:checked~.custom-control-label::after,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-interestGroupsRow .ml-form-interestGroupsRowCheckbox input[type=checkbox]:checked~.label-description::after {
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3e%3cpath fill='%23fff' d='M6.564.75l-3.59 3.612-1.538-1.55L0 4.26 2.974 7.25 8 2.193z'/%3e%3c/svg%3e");
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow .custom-radio .custom-control-input:checked~.custom-control-label::after,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow .custom-radio .custom-control-input:checked~.custom-control-label::after {
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='-4 -4 8 8'%3e%3ccircle r='3' fill='%23fff'/%3e%3c/svg%3e");
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow .custom-radio .custom-control-input:checked~.custom-control-label::before,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-horizontalRow .custom-radio .custom-control-input:checked~.custom-control-label::before,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow .custom-checkbox .custom-control-input:checked~.custom-control-label::before,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-horizontalRow .custom-checkbox .custom-control-input:checked~.custom-control-label::before,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedPermissions .ml-form-embedPermissionsOptionsCheckbox input[type=checkbox]:checked~.label-description::before,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-interestGroupsRow .ml-form-interestGroupsRowCheckbox input[type=checkbox]:checked~.label-description::before,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-checkboxRow input[type=checkbox]:checked~.label-description::before {
          border-color: #ffffff!important;
          background-color: #000000!important;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow .custom-radio .custom-control-label::before,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-horizontalRow .custom-radio .custom-control-label::before,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow .custom-radio .custom-control-label::after,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-horizontalRow .custom-radio .custom-control-label::after,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow .custom-checkbox .custom-control-label::before,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow .custom-checkbox .custom-control-label::after,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-horizontalRow .custom-checkbox .custom-control-label::before,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-horizontalRow .custom-checkbox .custom-control-label::after {
          top: 2px;
          box-sizing: border-box;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedPermissions .ml-form-embedPermissionsOptionsCheckbox .label-description::before,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedPermissions .ml-form-embedPermissionsOptionsCheckbox .label-description::after,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-checkboxRow .label-description::before,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-checkboxRow .label-description::after {
          top: 0px!important;
          box-sizing: border-box!important;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-checkboxRow .label-description::before,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-checkboxRow .label-description::after {
          top: 0px!important;
          box-sizing: border-box!important;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-interestGroupsRow .ml-form-interestGroupsRowCheckbox .label-description::after {
          top: 0px!important;
          box-sizing: border-box!important;
          position: absolute;
          left: -1.5rem;
          display: block;
          width: 1rem;
          height: 1rem;
          content: "";
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-interestGroupsRow .ml-form-interestGroupsRowCheckbox .label-description::before {
          top: 0px!important;
          box-sizing: border-box!important;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .custom-control-label::before {
          position: absolute;
          top: 4px;
          left: -1.5rem;
          display: block;
          width: 16px;
          height: 16px;
          pointer-events: none;
          content: "";
          background-color: #ffffff;
          border: #adb5bd solid 1px;
          border-radius: 50%;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .custom-control-label::after {
          position: absolute;
          top: 2px!important;
          left: -1.5rem;
          display: block;
          width: 1rem;
          height: 1rem;
          content: "";
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedPermissions .ml-form-embedPermissionsOptionsCheckbox .label-description::before,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-interestGroupsRow .ml-form-interestGroupsRowCheckbox .label-description::before,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-checkboxRow .label-description::before {
          position: absolute;
          top: 4px;
          left: -1.5rem;
          display: block;
          width: 16px;
          height: 16px;
          pointer-events: none;
          content: "";
          background-color: #ffffff;
          border: #adb5bd solid 1px;
          border-radius: 50%;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedPermissions .ml-form-embedPermissionsOptionsCheckbox .label-description::after {
          position: absolute;
          top: 0px!important;
          left: -1.5rem;
          display: block;
          width: 1rem;
          height: 1rem;
          content: "";
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-checkboxRow .label-description::after {
          position: absolute;
          top: 0px!important;
          left: -1.5rem;
          display: block;
          width: 1rem;
          height: 1rem;
          content: "";
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .custom-radio .custom-control-label::after {
          background: no-repeat 50%/50% 50%;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .custom-checkbox .custom-control-label::after,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedPermissions .ml-form-embedPermissionsOptionsCheckbox .label-description::after,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-interestGroupsRow .ml-form-interestGroupsRowCheckbox .label-description::after,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-checkboxRow .label-description::after {
          background: no-repeat 50%/50% 50%;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow .custom-control,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-horizontalRow .custom-control {
          position: relative;
          display: block;
          min-height: 1.5rem;
          padding-left: 1.5rem;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow .custom-radio .custom-control-input,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-horizontalRow .custom-radio .custom-control-input,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow .custom-checkbox .custom-control-input,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-horizontalRow .custom-checkbox .custom-control-input {
          position: absolute;
          z-index: -1;
          opacity: 0;
          box-sizing: border-box;
          padding: 0;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow .custom-radio .custom-control-label,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-horizontalRow .custom-radio .custom-control-label,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow .custom-checkbox .custom-control-label,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-horizontalRow .custom-checkbox .custom-control-label {
          color: #ffffff;
          font-size: 12px!important;
          font-family: 'Poppins', sans-serif;
          line-height: 22px;
          margin-bottom: 0;
          position: relative;
          vertical-align: top;
          font-style: normal;
          font-weight: 700;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-fieldRow .custom-select,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-horizontalRow .custom-select {
          background-color: #1a1a1a !important;
          color: #a8b2c1 !important;
          border-color: #2f2f2f;
          border-radius: 25px !important;
          border-style: solid !important;
          border-width: 1px !important;
          font-family: 'Poppins', sans-serif;
          font-size: 14px !important;
          line-height: 20px !important;
          margin-bottom: 0;
          margin-top: 0;
          padding: 10px 28px 10px 12px !important;
          width: 100% !important;
          box-sizing: border-box !important;
          max-width: 100% !important;
          height: auto;
          display: inline-block;
          vertical-align: middle;
          background: url('https://assets.mlcdn.com/ml/images/default/dropdown.svg') no-repeat right .75rem center/8px 10px;
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-horizontalRow {
          height: auto;
          width: 100%;
          float: left;
        }

        .ml-form-formContent.horozintalForm .ml-form-horizontalRow .ml-input-horizontal {
          width: 70%;
          float: left;
        }

        .ml-form-formContent.horozintalForm .ml-form-horizontalRow .ml-button-horizontal {
          width: 30%;
          float: left;
        }

        .ml-form-formContent.horozintalForm .ml-form-horizontalRow .ml-button-horizontal.labelsOn {
          padding-top: 25px;
        }

        .ml-form-formContent.horozintalForm .ml-form-horizontalRow .horizontal-fields {
          box-sizing: border-box;
          float: left;
          padding-right: 10px;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-horizontalRow input {
          background-color: #1a1a1a;
          color: #a8b2c1;
          border-color: #2f2f2f;
          border-radius: 25px;
          border-style: solid;
          border-width: 1px;
          font-family: 'Poppins', sans-serif;
          font-size: 14px;
          line-height: 20px;
          margin-bottom: 0;
          margin-top: 0;
          padding: 10px 10px;
          width: 100%;
          box-sizing: border-box;
          overflow-y: initial;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-horizontalRow button {
          background-color: #ffffff !important;
          border-color: #ffffff;
          border-style: solid;
          border-width: 1px;
          border-radius: 22px;
          box-shadow: none;
          color: #000000 !important;
          cursor: pointer;
          font-family: 'Poppins', sans-serif;
          font-size: 14px !important;
          font-weight: 700;
          line-height: 20px;
          margin: 0 !important;
          padding: 10px !important;
          width: 100%;
          height: auto;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-horizontalRow button:hover {
          background-color: #aeaeae !important;
          border-color: #aeaeae !important;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-checkboxRow input[type="checkbox"] {
          box-sizing: border-box;
          padding: 0;
          position: absolute;
          z-index: -1;
          opacity: 0;
          margin-top: 5px;
          margin-left: -1.5rem;
          overflow: visible;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-checkboxRow .label-description {
          color: #ffffff;
          display: block;
          font-family: 'Poppins', sans-serif;
          font-size: 12px;
          text-align: left;
          margin-bottom: 0;
          position: relative;
          vertical-align: top;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-checkboxRow label {
          font-weight: normal;
          margin: 0;
          padding: 0;
          position: relative;
          display: block;
          min-height: 24px;
          padding-left: 24px;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-checkboxRow label a {
          color: #ffffff;
          text-decoration: underline;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-checkboxRow label p {
          color: #ffffff !important;
          font-family: 'Poppins', sans-serif !important;
          font-size: 12px !important;
          font-weight: normal !important;
          line-height: 18px !important;
          padding: 0 !important;
          margin: 0 5px 0 0 !important;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-checkboxRow label p:last-child {
          margin: 0;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedSubmit {
          margin: 0 0 60px 0;
          float: left;
          width: 100%;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedSubmit button {
          background-color: #ffffff !important;
          border: none !important;
          border-radius: 22px !important;
          box-shadow: none !important;
          color: #000000 !important;
          cursor: pointer;
          font-family: 'Poppins', sans-serif !important;
          font-size: 14px !important;
          font-weight: 700 !important;
          line-height: 21px !important;
          height: auto;
          padding: 10px !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedSubmit button.loading {
          display: none;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedSubmit button:hover {
          background-color: #aeaeae !important;
        }

        .ml-subscribe-close {
          width: 30px;
          height: 30px;
          background: url('https://assets.mlcdn.com/ml/images/default/modal_close.png') no-repeat;
          background-size: 30px;
          cursor: pointer;
          margin-top: -10px;
          margin-right: -10px;
          position: absolute;
          top: 0;
          right: 0;
        }

        .ml-error input,
        .ml-error textarea,
        .ml-error select {
          border-color: red!important;
        }

        .ml-error .custom-checkbox-radio-list {
          border: 1px solid red !important;
          border-radius: 17px;
          padding: 10px;
        }

        .ml-error .label-description,
        .ml-error .label-description p,
        .ml-error .label-description p a,
        .ml-error label:first-child {
          color: #ff0000 !important;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-checkboxRow.ml-error .label-description p,
        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-checkboxRow.ml-error .label-description p:first-letter {
          color: #ff0000 !important;
        }

        @media only screen and (max-width: 400px) {
          .ml-form-embedWrapper.embedDefault,
          .ml-form-embedWrapper.embedPopup {
            width: 100%!important;
          }

          .ml-form-formContent.horozintalForm {
            float: left!important;
          }

          .ml-form-formContent.horozintalForm .ml-form-horizontalRow {
            height: auto!important;
            width: 100%!important;
            float: left!important;
          }

          .ml-form-formContent.horozintalForm .ml-form-horizontalRow .ml-input-horizontal {
            width: 100%!important;
          }

          .ml-form-formContent.horozintalForm .ml-form-horizontalRow .ml-input-horizontal > div {
            padding-right: 0px!important;
            padding-bottom: 10px;
          }

          .ml-form-formContent.horozintalForm .ml-button-horizontal {
            width: 100%!important;
          }

          .ml-form-formContent.horozintalForm .ml-button-horizontal.labelsOn {
            padding-top: 0px!important;
          }
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedPermissions {
          text-align: left;
          float: left;
          width: 100%;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedPermissions .ml-form-embedPermissionsContent {
          margin: 0 0 15px 0;
          text-align: left;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedPermissions .ml-form-embedPermissionsContent.horizontal {
          margin: 0 0 15px 0;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedPermissions .ml-form-embedPermissionsContent h4 {
          color: #000000;
          font-family: 'Open Sans', Arial, Helvetica, sans-serif;
          font-size: 12px;
          font-weight: 700;
          line-height: 18px;
          margin: 0 0 10px 0;
          word-break: break-word;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedPermissions .ml-form-embedPermissionsContent p {
          color: #000000;
          font-family: 'Open Sans', Arial, Helvetica, sans-serif;
          font-size: 12px;
          line-height: 18px;
          margin: 0 0 10px 0;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedPermissions .ml-form-embedPermissionsContent.privacy-policy p {
          color: #ffffff;
          font-family: 'Poppins', sans-serif;
          font-size: 12px;
          line-height: 22px;
          margin: 0 0 10px 0;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedPermissions .ml-form-embedPermissionsContent.privacy-policy p a {
          color: #ffffff;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedPermissions .ml-form-embedPermissionsContent.privacy-policy p:last-child {
          margin: 0;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedPermissions .ml-form-embedPermissionsContent p a {
          color: #000000;
          text-decoration: underline;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedPermissions .ml-form-embedPermissionsContent p:last-child {
          margin: 0 0 15px 0;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedPermissions .ml-form-embedPermissionsOptions {
          margin: 0;
          padding: 0;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedPermissions .ml-form-embedPermissionsOptionsCheckbox {
          margin: 0 0 10px 0;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedPermissions .ml-form-embedPermissionsOptionsCheckbox:last-child {
          margin: 0;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedPermissions .ml-form-embedPermissionsOptionsCheckbox label {
          font-weight: normal;
          margin: 0;
          padding: 0;
          position: relative;
          display: block;
          min-height: 24px;
          padding-left: 24px;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedPermissions .ml-form-embedPermissionsOptionsCheckbox .label-description {
          color: #ffffff;
          font-family: 'Poppins', sans-serif;
          font-size: 12px;
          line-height: 18px;
          text-align: left;
          margin-bottom: 0;
          position: relative;
          vertical-align: top;
          font-style: normal;
          font-weight: 700;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedPermissions .ml-form-embedPermissionsOptionsCheckbox .description {
          color: #ffffff;
          font-family: 'Poppins', sans-serif;
          font-size: 12px;
          font-style: italic;
          font-weight: 400;
          line-height: 18px;
          margin: 5px 0 0 0;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedPermissions .ml-form-embedPermissionsOptionsCheckbox input[type="checkbox"] {
          box-sizing: border-box;
          padding: 0;
          position: absolute;
          z-index: -1;
          opacity: 0;
          margin-top: 5px;
          margin-left: -1.5rem;
          overflow: visible;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedPermissions .ml-form-embedMailerLite-GDPR {
          padding-bottom: 20px;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedPermissions .ml-form-embedMailerLite-GDPR p {
          color: #000000;
          font-family: 'Open Sans', Arial, Helvetica, sans-serif;
          font-size: 10px;
          line-height: 14px;
          margin: 0;
          padding: 0;
        }

        #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedPermissions .ml-form-embedMailerLite-GDPR p a {
          color: #000000;
          text-decoration: underline;
        }

        @media (max-width: 768px) {
          #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedPermissions .ml-form-embedPermissionsContent p {
            font-size: 12px !important;
            line-height: 18px !important;
          }

          #mlb2-34057365.ml-form-embedContainer .ml-form-embedWrapper .ml-form-embedBody .ml-form-embedPermissions .ml-form-embedMailerLite-GDPR p {
            font-size: 10px !important;
            line-height: 14px !important;
          }
        }
      `}</style>

      <div
        id="mlb2-34057365"
        className="ml-form-embedContainer ml-subscribe-form ml-subscribe-form-34057365"
      >
        <div className="ml-form-align-center ">
          <div className="ml-form-embedWrapper embedForm">
            <div className="ml-form-embedBody ml-form-embedBodyDefault row-form">
              <div className="ml-form-embedContent">
                <h4>Join the waitlist</h4>
              </div>

              <form
                className="ml-block-form"
                action="https://assets.mailerlite.com/jsonp/1955610/forms/172579220566837150/subscribe"
                method="post"
              >
                <div className="ml-form-formContent">
                  <div className="ml-form-fieldRow ml-last-item">
                    <div className="ml-field-group ml-field-email ml-validate-email ml-validate-required">
                      <input
                        aria-label="email"
                        aria-required="true"
                        type="email"
                        className="form-control"
                        name="fields[email]"
                        placeholder="Email"
                        autoComplete="email"
                      />
                    </div>
                  </div>
                </div>

                <div className="ml-form-checkboxRow ml-validate-required">
                  <label className="checkbox">
                    <input type="checkbox" />
                    <div className="label-description">
                      <p>
                        I agree to receive emails about the Unbaked app launch
                        and updates.
                      </p>
                    </div>
                  </label>
                </div>

                <input type="hidden" name="ml-submit" value="1" />

                <div className="ml-form-embedSubmit">
                  <button type="submit" className="primary">
                    Claim 3 Months Free
                  </button>
                  <button
                    disabled
                    style={{ display: "none" }}
                    type="button"
                    className="loading"
                  >
                    <div className="ml-form-embedSubmitLoad"></div>
                    <span className="sr-only">Loading...</span>
                  </button>
                </div>

                <input type="hidden" name="anticsrf" value="true" />
              </form>
            </div>

            <div
              className="ml-form-successBody row-success"
              style={{ display: "none" }}
            >
              <div className="ml-form-successContent">
                <h4>You're in.</h4>
                <p>You have successfully joined our waitlist.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            function ml_webform_success_34057365() {
              var $ = window.jQuery;
              if ($) {
                $('.ml-subscribe-form-34057365 .row-success').show();
                $('.ml-subscribe-form-34057365 .row-form').hide();
              }
            }
          `,
        }}
      />
    </div>
  );
}
