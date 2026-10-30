import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "@/lib/i18n";
import { ScoreBoardTheme } from "@/constants/theme";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showSummary?: boolean;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  showSummary = true,
}: PaginationProps) {
  const { t } = useTranslation();

  if (totalPages <= 1) return null;

  const safePage = Math.max(1, Math.min(currentPage, totalPages));

  // Determine which page numbers to display
  const visiblePages = Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => {
    return p === 1 || p === totalPages || Math.abs(p - safePage) <= 1;
  });

  return (
    <View style={styles.container}>
      {showSummary && (
        <Text style={styles.summaryText}>
          {t("common.pageOf", { current: safePage, total: totalPages })}
        </Text>
      )}

      <View style={styles.controlsRow}>
        {/* Previous Button */}
        <TouchableOpacity
          style={[styles.navBtn, safePage === 1 && styles.navBtnDisabled]}
          onPress={() => onPageChange(Math.max(1, safePage - 1))}
          disabled={safePage === 1}
          activeOpacity={0.7}
        >
          <Ionicons
            name="chevron-back"
            size={16}
            color={safePage === 1 ? "rgba(220, 225, 251, 0.2)" : ScoreBoardTheme.onSurface}
          />
          <Text
            style={[
              styles.navBtnText,
              safePage === 1 && styles.navBtnTextDisabled,
            ]}
          >
            {t("common.previous")}
          </Text>
        </TouchableOpacity>

        {/* Page Number Buttons */}
        <View style={styles.pagesRow}>
          {visiblePages.map((p, pIdx, arr) => {
            const prevP = arr[pIdx - 1];
            const hasGap = prevP && p - prevP > 1;

            return (
              <React.Fragment key={p}>
                {hasGap && <Text style={styles.ellipsis}>...</Text>}
                <TouchableOpacity
                  style={[styles.pageBtn, safePage === p && styles.pageBtnActive]}
                  onPress={() => onPageChange(p)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.pageBtnText,
                      safePage === p && styles.pageBtnTextActive,
                    ]}
                  >
                    {p}
                  </Text>
                </TouchableOpacity>
              </React.Fragment>
            );
          })}
        </View>

        {/* Next Button */}
        <TouchableOpacity
          style={[styles.navBtn, safePage === totalPages && styles.navBtnDisabled]}
          onPress={() => onPageChange(Math.min(totalPages, safePage + 1))}
          disabled={safePage === totalPages}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.navBtnText,
              safePage === totalPages && styles.navBtnTextDisabled,
            ]}
          >
            {t("common.next")}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={safePage === totalPages ? "rgba(220, 225, 251, 0.2)" : ScoreBoardTheme.onSurface}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 18,
    borderTopWidth: 1,
    borderTopColor: ScoreBoardTheme.borderGhost,
    marginTop: 12,
    gap: 12,
    alignItems: "center",
  },
  summaryText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "rgba(220, 225, 251, 0.5)",
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: ScoreBoardTheme.surfaceContainerLow,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderGhost,
  },
  navBtnDisabled: {
    opacity: 0.4,
  },
  navBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: ScoreBoardTheme.onSurface,
  },
  navBtnTextDisabled: {
    color: "rgba(220, 225, 251, 0.3)",
  },
  pagesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  pageBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: ScoreBoardTheme.surfaceContainerLow,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderGhost,
    justifyContent: "center",
    alignItems: "center",
  },
  pageBtnActive: {
    backgroundColor: ScoreBoardTheme.primaryContainer,
    borderColor: "rgba(195, 192, 255, 0.4)",
  },
  pageBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(220, 225, 251, 0.7)",
  },
  pageBtnTextActive: {
    color: "#ffffff",
    fontWeight: "900",
  },
  ellipsis: {
    color: "rgba(220, 225, 251, 0.4)",
    fontWeight: "700",
    paddingHorizontal: 2,
  },
});
