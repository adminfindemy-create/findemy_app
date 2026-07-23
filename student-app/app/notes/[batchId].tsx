import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { SkeletonLoader } from '@/components/common/SkeletonLoader';
import { useEnrollments } from '@/hooks/useEnrollments';
import {
  useCreateNote,
  useDeleteNote,
  useNoteAttachmentUpload,
  useNotesForBatch,
  useUpdateNote,
} from '@/hooks/useNotes';
import type { Note, NoteAttachmentType } from '@findemy/types';
import {
  type Attachment,
  AttachmentPicker,
  Button,
  IconButton,
  IconPlus,
  MenuRow,
  SectionLabel,
  Summary,
  SummaryRow,
  useTheme,
} from '@findemy/ui';
import { format } from 'date-fns';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function SheetHandle() {
  const theme = useTheme();
  return (
    <View
      style={{
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: theme.color.hairline,
        alignSelf: 'center',
        marginTop: 10,
        marginBottom: 6,
      }}
    />
  );
}

function attachmentFromNote(note: Note | null): Attachment | null {
  if (!note?.attachment_url) return null;
  return {
    url: note.attachment_url,
    type: (note.attachment_type as NoteAttachmentType) ?? 'photo',
    name: note.attachment_name,
  };
}

// ─── Create/Edit sheet ──────────────────────────────────────────────────────

function NoteSheet({
  batchId,
  note,
  onClose,
}: {
  batchId: string;
  /** null = creating a new note; a Note = editing that note. */
  note: Note | null;
  onClose: () => void;
}) {
  const theme = useTheme();
  const isEdit = !!note;
  const [title, setTitle] = useState(note?.title ?? '');
  const [body, setBody] = useState(note?.body ?? '');
  const [attachment, setAttachment] = useState<Attachment | null>(attachmentFromNote(note));

  const createMut = useCreateNote();
  const updateMut = useUpdateNote(batchId);
  const deleteMut = useDeleteNote(batchId);
  const uploadAttachment = useNoteAttachmentUpload();
  const saving = createMut.isPending || updateMut.isPending;

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Please add a title for this note.');
      return;
    }
    try {
      if (isEdit && note) {
        await updateMut.mutateAsync({
          id: note.id,
          title: title.trim(),
          body: body.trim() || null,
          attachment_url: attachment?.url ?? null,
          attachment_type: attachment?.type ?? null,
          attachment_name: attachment?.name ?? null,
        });
      } else {
        await createMut.mutateAsync({
          batch_id: batchId,
          title: title.trim(),
          body: body.trim() || undefined,
          attachment_url: attachment?.url,
          attachment_type: attachment?.type,
          attachment_name: attachment?.name,
        });
      }
      onClose();
    } catch {
      /* onError handles */
    }
  };

  const handleDelete = () => {
    if (!note) return;
    Alert.alert('Delete note', 'This note will be permanently deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMut.mutateAsync(note.id);
            onClose();
          } catch {
            /* onError handles */
          }
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={{ maxHeight: '100%' }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <SheetHandle />
      <View style={sheetStyles.titleRow}>
        <Text style={[sheetStyles.title, { fontFamily: theme.font.serif, color: theme.color.ink }]}>
          {isEdit ? 'Edit note' : 'New note'}
        </Text>
        <Pressable onPress={onClose} hitSlop={12}>
          <Text style={{ fontSize: 20, color: theme.color.mist }}>✕</Text>
        </Pressable>
      </View>

      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Title"
        placeholderTextColor={theme.color.mist}
        style={[
          sheetStyles.input,
          {
            fontFamily: theme.font.sansBold,
            color: theme.color.ink,
            backgroundColor: '#fff',
            borderColor: theme.color.hairline,
          },
        ]}
      />
      <TextInput
        value={body}
        onChangeText={setBody}
        placeholder="Write your note…"
        placeholderTextColor={theme.color.mist}
        multiline
        textAlignVertical="top"
        style={[
          sheetStyles.input,
          sheetStyles.bodyInput,
          {
            fontFamily: theme.font.sans,
            color: theme.color.ink,
            backgroundColor: '#fff',
            borderColor: theme.color.hairline,
          },
        ]}
      />

      <Text
        style={{
          fontFamily: theme.font.sansBold,
          fontSize: 11,
          letterSpacing: 1.1,
          color: theme.color.whisper,
          marginBottom: 8,
        }}
      >
        ATTACHMENT
      </Text>
      <AttachmentPicker value={attachment} onChange={setAttachment} onUpload={uploadAttachment} />

      <View style={{ marginTop: 22, gap: 10 }}>
        <Button onPress={handleSave} loading={saving} block>
          {isEdit ? 'Save changes' : 'Add note'}
        </Button>
        {isEdit ? (
          <Button variant="rose" block onPress={handleDelete} loading={deleteMut.isPending}>
            Delete note
          </Button>
        ) : null}
      </View>
    </ScrollView>
  );
}

// ─── Main screen ────────────────────────────────────────────────────────────

export default function BatchNotesScreen() {
  const theme = useTheme();
  const { batchId, batch_title, category } = useLocalSearchParams<{
    batchId: string;
    batch_title?: string;
    category?: string;
  }>();
  const enrollments = useEnrollments();
  const notesQuery = useNotesForBatch(batchId);

  // `undefined` = sheet closed, `null` = creating a new note, a Note = editing.
  const [sheetNote, setSheetNote] = useState<Note | null | undefined>(undefined);

  const enrollment = useMemo(
    () => (enrollments.data?.items ?? []).find((item: any) => item.batch_id === batchId),
    [enrollments.data, batchId]
  );
  const title = batch_title ?? enrollment?.batch_title ?? 'Class notes';
  const categoryValue = category ?? enrollment?.category;

  const notes: Note[] = (notesQuery.data as any)?.items ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={['top']}>
      <ScreenHeader
        title="Notes"
        rightAction={
          <IconButton
            accessibilityLabel="Add note"
            onPress={() => setSheetNote(null)}
            icon={<IconPlus size={18} color={theme.color.ink} />}
          />
        }
      />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <SectionLabel>Class</SectionLabel>
        <Summary>
          <SummaryRow label="Class" value={title} />
          {categoryValue ? (
            <SummaryRow
              label="Subject"
              value={String(categoryValue).charAt(0).toUpperCase() + String(categoryValue).slice(1)}
              last
            />
          ) : null}
        </Summary>

        <SectionLabel>Your notes</SectionLabel>

        {notesQuery.isLoading ? (
          <View style={{ gap: 10 }}>
            <SkeletonLoader height={64} borderRadius={16} />
            <SkeletonLoader height={64} borderRadius={16} />
          </View>
        ) : notesQuery.isError ? (
          <ErrorState code={(notesQuery.error as any)?.code} onRetry={() => notesQuery.refetch()} />
        ) : notes.length === 0 ? (
          <EmptyState
            message="No notes yet for this class."
            actionLabel="Add your first note"
            onAction={() => setSheetNote(null)}
          />
        ) : (
          notes.map((note) => (
            <MenuRow
              key={note.id}
              title={note.title}
              sub={
                [
                  note.body ? note.body.slice(0, 60) : null,
                  note.attachment_url ? '📎 Attachment' : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || format(new Date(note.updated_at), 'd MMM yyyy')
              }
              onPress={() => setSheetNote(note)}
            />
          ))
        )}
      </ScrollView>

      <Modal
        visible={sheetNote !== undefined}
        transparent
        animationType="slide"
        onRequestClose={() => setSheetNote(undefined)}
      >
        <Pressable style={sheetStyles.backdrop} onPress={() => setSheetNote(undefined)} />
        <View style={[sheetStyles.sheet, { backgroundColor: theme.color.paper }]}>
          {sheetNote !== undefined ? (
            <NoteSheet batchId={batchId} note={sheetNote} onClose={() => setSheetNote(undefined)} />
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 48 },
});

const sheetStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(20,16,14,0.45)' },
  sheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: '85%',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  title: { fontSize: 22 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 12,
  },
  bodyInput: {
    minHeight: 110,
  },
});
