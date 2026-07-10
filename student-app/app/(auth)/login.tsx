import React, { useState } from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTheme, Input, Button } from "@findemy/ui";
import { AuthScaffold, AuthHeading, AuthSub, Em } from "@/components/AuthScaffold";
import { api } from "@/lib/api";

const schema = z.object({
  phone: z.string().min(10).max(10),
});

type FormData = z.infer<typeof schema>;

export default function LoginScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const { control, handleSubmit } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { phone: "" },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await api.auth.requestOtp({ phone: data.phone, role: "student" });
      router.push(`/(auth)/signup-otp?otp_id=${res.otp_id}&phone=${data.phone}`);
    } catch (e: any) {
      if (e.code === "RATE_LIMITED") {
        setErrorMsg("Too many attempts, try in a few minutes.");
      } else {
        setErrorMsg("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScaffold>
      <View style={{ marginTop: 12 }}>
        <AuthHeading size={35}>
          Book your <Em>first class</Em>
        </AuthHeading>
        <AuthSub>We'll text a 6-digit code to verify your number.</AuthSub>
      </View>

      <View style={{ marginTop: 26 }}>
        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <Input
              label="Phone number"
              prefix={
                <Text style={{ fontFamily: theme.font.sansBold, fontSize: 16, color: theme.color.inkSoft }}>
                  +91
                </Text>
              }
              placeholder="98765 43210"
              keyboardType="number-pad"
              maxLength={10}
              value={value}
              onChangeText={onChange}
              error={error?.message}
            />
          )}
        />
      </View>

      {errorMsg ? (
        <Text style={{ color: theme.color.rose, fontFamily: theme.font.sans, fontSize: 13, marginTop: 8 }}>
          {errorMsg}
        </Text>
      ) : null}

      <View style={{ marginTop: 20 }}>
        <Button block variant="dark" loading={loading} onPress={handleSubmit(onSubmit)}>
          Get OTP
        </Button>
      </View>

      <View style={{ marginTop: 24, alignItems: "center" }}>
        <Text style={{ fontFamily: theme.font.sans, fontSize: 13, color: theme.color.mist }}>
          New to Findemy?{" "}
          <Text
            style={{ fontFamily: theme.font.sansBold, color: theme.color.persimmon }}
            onPress={() => router.push("/(auth)/signup")}
          >
            Sign up
          </Text>
        </Text>
      </View>
    </AuthScaffold>
  );
}
