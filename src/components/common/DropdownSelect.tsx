import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Keyboard } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  desc?: string;
  testID?: string;
}

export interface DropdownSelectProps {
  label?: string;
  value: string;
  options: DropdownOption[];
  onSelect: (value: string) => void;
  placeholder?: string;
  testID?: string;
  disabled?: boolean;
}

export function DropdownSelect({
  label,
  value,
  options,
  onSelect,
  placeholder = "Select an option",
  testID,
  disabled = false,
}: DropdownSelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = (val: string) => {
    Keyboard.dismiss();
    onSelect(val);
    setIsOpen(false);
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      {/* Trigger Button */}
      <TouchableOpacity
        style={[
          styles.trigger,
          isOpen && styles.triggerOpen,
          disabled && styles.triggerDisabled,
        ]}
        onPress={() => {
          if (!disabled) {
            Keyboard.dismiss();
            setIsOpen(!isOpen);
          }
        }}
        activeOpacity={0.7}
        testID={testID ? `${testID}-trigger` : undefined}
        disabled={disabled}
      >
        <View style={styles.triggerContent}>
          {selectedOption?.icon && (
            <View style={styles.iconContainer}>{selectedOption.icon}</View>
          )}
          <Text
            style={[
              styles.triggerText,
              !selectedOption && styles.placeholderText,
            ]}
            numberOfLines={1}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </Text>
        </View>

        <Ionicons
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={18}
          color="#94a3b8"
        />
      </TouchableOpacity>

      {/* Options List - display: none when closed so it takes 0 space, but stays in tree */}
      <View
        style={[
          styles.optionsList,
          { display: isOpen ? "flex" : "none" },
        ]}
        testID={testID ? `${testID}-menu` : undefined}
      >
        {options.map((opt) => {
          const isSelected = opt.value === value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.optionItem,
                isSelected && styles.optionItemSelected,
              ]}
              onPress={() => handleSelect(opt.value)}
              activeOpacity={0.7}
              testID={opt.testID || (testID ? `${testID}-option-${opt.value}` : undefined)}
            >
              <View style={styles.optionLeft}>
                {opt.icon && (
                  <View style={styles.optionIconContainer}>{opt.icon}</View>
                )}
                <View style={styles.optionTextContainer}>
                  <Text
                    style={[
                      styles.optionLabel,
                      isSelected && styles.optionLabelSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {opt.desc ? (
                    <Text style={styles.optionDesc} numberOfLines={1}>
                      {opt.desc}
                    </Text>
                  ) : null}
                </View>
              </View>

              {isSelected && (
                <Ionicons name="checkmark-circle" size={18} color="#6366f1" />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  trigger: {
    height: 48,
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  triggerOpen: {
    borderColor: "#6366f1",
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  triggerDisabled: {
    opacity: 0.5,
  },
  triggerContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  iconContainer: {
    marginRight: 10,
  },
  triggerText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#f8fafc",
  },
  placeholderText: {
    color: "#64748b",
  },
  optionsList: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "#6366f1",
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    overflow: "hidden",
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  optionItemSelected: {
    backgroundColor: "rgba(99, 102, 241, 0.12)",
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  optionIconContainer: {
    marginRight: 10,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#e2e8f0",
  },
  optionLabelSelected: {
    color: "#818cf8",
  },
  optionDesc: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
});
