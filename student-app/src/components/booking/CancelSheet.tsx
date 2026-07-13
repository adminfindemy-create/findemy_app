import React, { useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useTheme, Button } from "@findemy/ui";

export type CancelSheetKind = "trial" | "workshop";

export type CancelSheetTarget = {
  title: string;
  subtitle?: string;
  whenLabel: string;
  scheduledAt: Date;
  /** Captured amount the user paid, in paise. 0 means free booking. */
  amountPaise: number;
  /** Has the user already rescheduled this booking? Trial-only. */
  rescheduled?: boolean;
  /** Payout method hint shown in the refund row — e.g. "UPI ••12". */
  payoutHint?: string;
};

export function CancelSheet({
  visible,
  kind,
  target,
  onClose,
  onConfirm,
  submitting,
}: {
  visible: boolean;
  kind: CancelSheetKind;
  target: CancelSheetTarget | null;
  onClose: () => void;
  onConfirm: (args: { acknowledgeNoRefund: boolean; reason?: string }) => Promise<void> | void;
  submitting?: boolean;
}) {
  const theme = useTheme();
  const [reason, setReason] = useState("");
  const [ackChecked, setAckChecked] = useState(false);

  const cutoffHours = kind === "trial" ? 4 : 24;
  const cutoffLabel = kind === "trial" ? "4 hours" : "24 hours";

  const variant = useMemo(() => {
    if (!target) return "free" as const;
    if (kind === "trial" && target.rescheduled) return "rescheduled" as const;
    if (target.amountPaise <= 0) return "free" as const;
    const hoursUntil = (target.scheduledAt.getTime() - Date.now()) / 3_600_000;
    const eligible = kind === "trial" ? hoursUntil >= cutoffHours : hoursUntil > cutoffHours;
    return eligible ? ("refund" as const) : ("noRefund" as const);
  }, [kind, target, cutoffHours]);

  // Reset local state whenever the sheet opens for a new target
  React.useEffect(() => {
    if (visible) {
      setReason("");
      setAckChecked(false);
    }
  }, [visible, target?.title]);

  if (!target) return null;

  const dismiss = () => {
    if (submitting) return;
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={dismiss}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.scrim} onPress={dismiss} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View
            style={[
              styles.sheet,
              { backgroundColor: theme.color.paper },
            ]}
          >
            <View
              style={[
                styles.handle,
                { backgroundColor: theme.color.hairline },
              ]}
            />

            <Text
              style={{
                fontFamily: theme.font.serif,
                fontSize: theme.type.h3.size,
                color: theme.color.ink,
                marginBottom: 4,
              }}
            >
              {variant === "rescheduled"
                ? `Can't cancel this ${kind}`
                : `Cancel this ${kind}?`}
            </Text>

            <Text
              style={{
                fontFamily: theme.font.sans,
                fontSize: 15,
                fontWeight: "600",
                color: theme.color.ink,
                marginTop: 6,
              }}
            >
              {target.title}
            </Text>
            {target.subtitle && (
              <Text
                style={{
                  fontFamily: theme.font.sans,
                  fontSize: 13,
                  color: theme.color.mist,
                  marginTop: 2,
                }}
              >
                {target.subtitle}
              </Text>
            )}
            <Text
              style={{
                fontFamily: theme.font.sans,
                fontSize: 13,
                color: theme.color.inkSoft,
                marginTop: 4,
              }}
            >
              {target.whenLabel}
            </Text>

            {/* Variant body */}
            <View style={{ marginTop: 16 }}>
              {variant === "rescheduled" && (
                <View
                  style={[
                    styles.infoCard,
                    {
                      backgroundColor: theme.color.roseSoft,
                      borderColor: theme.color.rose + "33",
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontFamily: theme.font.sans,
                      fontSize: 14,
                      fontWeight: "600",
                      color: theme.color.rose,
                      marginBottom: 6,
                    }}
                  >
                    Rescheduled classes can't be cancelled
                  </Text>
                  <Text
                    style={{
                      fontFamily: theme.font.sans,
                      fontSize: 13,
                      lineHeight: 18,
                      color: theme.color.inkSoft,
                    }}
                  >
                    Reach out to the academy if you can't attend — they may
                    accommodate you.
                  </Text>
                </View>
              )}

              {variant === "refund" && (
                <View
                  style={[
                    styles.infoCard,
                    {
                      backgroundColor: theme.color.jadeSoft,
                      borderColor: theme.color.jade + "33",
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontFamily: theme.font.sans,
                      fontSize: 14,
                      fontWeight: "600",
                      color: theme.color.jade,
                      marginBottom: 10,
                    }}
                  >
                    Eligible for full refund
                  </Text>
                  <RefundRow
                    label="Refund amount"
                    value={formatRupees(target.amountPaise)}
                  />
                  {target.payoutHint && (
                    <RefundRow label="Refund to" value={target.payoutHint} />
                  )}
                  <RefundRow label="Arrives in" value="5–7 business days" />
                </View>
              )}

              {variant === "noRefund" && (
                <>
                  <View
                    style={[
                      styles.infoCard,
                      {
                        backgroundColor: theme.color.roseSoft,
                        borderColor: theme.color.rose + "33",
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontFamily: theme.font.sans,
                        fontSize: 14,
                        fontWeight: "600",
                        color: theme.color.rose,
                        marginBottom: 6,
                      }}
                    >
                      No refund available
                    </Text>
                    <Text
                      style={{
                        fontFamily: theme.font.sans,
                        fontSize: 13,
                        lineHeight: 18,
                        color: theme.color.inkSoft,
                      }}
                    >
                      Cancellations within {cutoffLabel} of the {kind} are
                      non-refundable. You paid{" "}
                      {formatRupees(target.amountPaise)} — this won't be
                      returned.
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => setAckChecked((prevChecked) => !prevChecked)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: 14,
                    }}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        {
                          borderColor: ackChecked
                            ? theme.color.rose
                            : theme.color.hairline,
                          backgroundColor: ackChecked
                            ? theme.color.rose
                            : "transparent",
                        },
                      ]}
                    >
                      {ackChecked && (
                        <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>
                          ✓
                        </Text>
                      )}
                    </View>
                    <Text
                      style={{
                        fontFamily: theme.font.sans,
                        fontSize: 13,
                        color: theme.color.ink,
                        flex: 1,
                      }}
                    >
                      I understand I will not get a refund.
                    </Text>
                  </Pressable>
                </>
              )}

              {variant === "free" && (
                <Text
                  style={{
                    fontFamily: theme.font.sans,
                    fontSize: 13,
                    color: theme.color.mist,
                  }}
                >
                  Free {kind} — no payment to refund.
                </Text>
              )}
            </View>

            {/* Reason input (skip on rescheduled) */}
            {variant !== "rescheduled" && (
              <View style={{ marginTop: 16 }}>
                <Text
                  style={{
                    fontFamily: theme.font.sans,
                    fontSize: 12,
                    color: theme.color.mist,
                    marginBottom: 6,
                  }}
                >
                  Reason (optional)
                </Text>
                <TextInput
                  value={reason}
                  onChangeText={setReason}
                  placeholder="Tell us why…"
                  placeholderTextColor={theme.color.whisper}
                  multiline
                  numberOfLines={2}
                  style={{
                    fontFamily: theme.font.sans,
                    fontSize: 14,
                    color: theme.color.ink,
                    backgroundColor: theme.color.ivory,
                    borderColor: theme.color.hairline,
                    borderWidth: 1,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    minHeight: 56,
                    textAlignVertical: "top",
                  }}
                />
              </View>
            )}

            {/* CTAs */}
            <View style={{ marginTop: 18, gap: 10 }}>
              {variant === "rescheduled" ? (
                <Button variant="ghost" onPress={dismiss} block>
                  Close
                </Button>
              ) : (
                <>
                  <Button
                    variant="rose"
                    block
                    loading={submitting}
                    disabled={variant === "noRefund" && !ackChecked}
                    onPress={() =>
                      onConfirm({
                        acknowledgeNoRefund: variant === "noRefund",
                        reason: reason.trim() || undefined,
                      })
                    }
                  >
                    {variant === "noRefund" ? "Cancel anyway" : "Confirm cancel"}
                  </Button>
                  <Button variant="ghost" onPress={dismiss} block>
                    Keep {kind}
                  </Button>
                </>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function RefundRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
      <Text
        style={{
          fontFamily: theme.font.sans,
          fontSize: 13,
          color: theme.color.inkSoft,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontFamily: theme.font.sans,
          fontSize: 13,
          fontWeight: "600",
          color: theme.color.ink,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function formatRupees(paise: number): string {
  const rupees = paise / 100;
  return rupees % 1 === 0 ? `₹${rupees.toFixed(0)}` : `₹${rupees.toFixed(2)}`;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(20,17,15,0.4)",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: 2,
    marginBottom: 14,
  },
  infoCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
