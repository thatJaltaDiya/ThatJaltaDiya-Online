import React from "react";
import { Helmet } from "react-helmet-async";
import { Mail, Phone } from "lucide-react";
import { Badge } from "../../components/ui/Badge.jsx";

export function Contact() {
  return (
    <>
      <Helmet>
        <title>Contact Us | That Jalta Diya</title>
      </Helmet>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-8">
          <Badge variant="butter" className="mb-3">
            SUPPORT
          </Badge>
          <h1 className="font-editorial text-3xl sm:text-4xl font-extrabold text-primary mb-3">
            Contact Us
          </h1>
          <p className="text-sm sm:text-base text-primary/80 font-medium">
            If any help is required, please contact:
          </p>
        </div>

        <div className="bg-surface rounded-2xl border border-border/20 shadow-sm p-8 sm:p-10 space-y-8 max-w-xl mx-auto">
          <div className="space-y-8 text-primary/90">
            <div className="flex items-start gap-5">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                <Mail className="w-6 h-6 text-accent" />
              </div>
              <div className="space-y-1">
                <span className="block font-bold text-primary text-lg sm:text-xl">
                  Customer Care
                </span>
                <span className="text-primary text-base sm:text-lg font-semibold block">
                  thatjaltadiya@gmail.com
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
