import React from "react";
import Template1 from "./ReceiptTemplates/Template1";
import Template2 from "./ReceiptTemplates/Template2";
import Template3 from "./ReceiptTemplates/Template3";
import { useSelector } from "react-redux";

const ReceiptTemplateSelector = React.forwardRef(({ data }, ref) => {
  const company = useSelector((state) => state.companyState.data);
  const selectedTemplate = company.receiptTemplate || "template1";

  const templates = {
    template1: Template1,
    template2: Template2,
    template3: Template3,
  };

  const SelectedTemplate = templates[selectedTemplate];

  return <SelectedTemplate ref={ref} data={data} />;
});

export default ReceiptTemplateSelector;
