import React, { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useReactToPrint } from "react-to-print";
import { capitalizeFirstLetter } from "../../config/Functions";
import { format } from "date-fns";
import ReceiptTemplateSelector from "./ReceiptTemplateSelector";
import { ActionCreators } from "../../actions/action";

const ReceiptTemplate = React.forwardRef((props, ref) => {
  const {
    customerName,
    products,
    amountPaid,
    total,
    balance,
    workerName,
    date,
    discount,
  } = props;
  
  const [isReady, setIsReady] = useState(false);
  const componentRef = useRef();
  const dispatch = useDispatch();
  const company = useSelector((state) => state.companyState.data);

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    onAfterPrint: () => {
      console.log("Printing completed");
    },
    onPrintError: (error) => {
      console.error("Printing failed", error);
    }
  });

  useEffect(() => {
    // Set a small delay to ensure the component is fully rendered
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isReady) {
      console.log("Print dialog should appear now");
      handlePrint();
    }
  }, [isReady, handlePrint]);

  const handleCompanyUpdate = () => {
    // Only dispatch if company data is available
    if (company) {
      dispatch(ActionCreators.fetchCompanySuccess(company));
    }
  };

  return (
    <div ref={ref}>
      <div ref={componentRef}>
        <ReceiptTemplateSelector data={props} />
      </div>
    </div>
  );
});

export default ReceiptTemplate;
