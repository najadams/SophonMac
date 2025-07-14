// src/components/PrintButton.jsx
import React, { useEffect, useState } from "react";

const PrintButton = () => {
  const [printer, setPrinter] = useState(null);

  useEffect(() => {
    const loadQZTray = () => {
      if (!window.qz) {
        console.error("QZ Tray is not loaded.");
        return;
      }

      // Connect to QZ Tray
      window.qz.websocket
        .connect()
        .then(() => {
          console.log("QZ Tray connected");
          // Find USB printer
          return window.qz.printers.find();
        })
        .then((printers) => {
          const usbPrinter = printers.find((printer) =>
            printer.includes("USB")
          );
          if (usbPrinter) {
            setPrinter(usbPrinter);
            console.log("USB Printer found:", usbPrinter);
          } else {
            console.error("No USB printer found.");
          }
        })
        .catch(console.error);

      // Disconnect from QZ Tray on component unmount
      return () => {
        window.qz.websocket
          .disconnect()
          .then(() => {
            console.log("QZ Tray disconnected");
          })
          .catch(console.error);
      };
    };

    // Delay the initialization to ensure QZ Tray script is loaded
    setTimeout(loadQZTray, 1000);
  }, []);

  const printReceipt = () => {
    if (!printer) {
      console.error("No printer available.");
      return;
    }

    const config = window.qz.configs.create(printer);
    const data = [{ type: "raw", format: "plain", data: "Hello World\n" }];
    window.qz.print(config, data).catch(console.error);
  };

  return (
    <button onClick={printReceipt} disabled={!printer}>
      Print Receipt
    </button>
  );
};

export default PrintButton;
