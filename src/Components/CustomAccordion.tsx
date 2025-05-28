import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

interface AccordionItemData {
  value: string;
  title: string;
  content: React.ReactNode;
}

interface CustomAccordionProps {
  items: AccordionItemData[];
  type?: "single" | "multiple";
  collapsible?: boolean; // For type 'single', allows collapsing the open item
}

interface AccordionItemComponentProps {
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
  onClick: () => void;
}

const AccordionItemComponent: React.FC<AccordionItemComponentProps> = ({
  title,
  children,
  isOpen,
  onClick,
}) => {
  return (
    <div>
      <button
        onClick={onClick}
        className="flex justify-between items-center w-full p-4 font-medium text-left text-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-opacity-75 transition-colors"
      >
        <span>{title}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={20} className="text-[#2563eb]" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.section
            key="content"
            initial="collapsed"
            animate="open"
            exit="collapsed"
            variants={{
              open: { opacity: 1, height: "auto" },
              collapsed: { opacity: 0, height: 0 },
            }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <motion.div
              initial={{
                opacity: 0,
                filter: "blur(3px)",
                clipPath: "inset(0% 0% 100% 0%)",
              }}
              animate={{
                opacity: 1,
                filter: "blur(0px)",
                clipPath: "inset(0% 0% 0% 0%)",
              }}
              exit={{
                opacity: 0,
                filter: "blur(3px)",
                clipPath: "inset(0% 0% 100% 0%)",
              }}
              transition={{
                duration: 0.25,
                ease: [0.04, 0.62, 0.23, 0.98],
                delay: 0.05,
              }}
              className="px-4 pb-4 pt-2 text-gray-300"
            >
              {children}
            </motion.div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
};

const CustomAccordion: React.FC<CustomAccordionProps> = ({
  items,
  type = "single",
  collapsible = false,
}) => {
  const [openItems, setOpenItems] = useState<string[]>([]);

  const handleClick = (value: string) => {
    setOpenItems((prev) => {
      if (type === "single") {
        if (prev.includes(value)) {
          return collapsible ? [] : prev; // If collapsible, close; else keep open
        }
        return [value]; // Open new item
      } else {
        // type === "multiple"
        return prev.includes(value)
          ? prev.filter((item) => item !== value)
          : [...prev, value];
      }
    });
  };

  return (
    <div className="w-full bg-gray-900 border border-blue-500/30 rounded-lg overflow-hidden">
      {items.map((item, index) => (
        <React.Fragment key={item.value}>
          <AccordionItemComponent
            title={item.title}
            isOpen={openItems.includes(item.value)}
            onClick={() => handleClick(item.value)}
          >
            {item.content}
          </AccordionItemComponent>
          {index < items.length - 1 && (
            <div className="px-4">
              <div className="h-px bg-blue-500/30"></div>
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default CustomAccordion;
