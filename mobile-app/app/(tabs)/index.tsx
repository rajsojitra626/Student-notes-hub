import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform, Animated, StatusBar, Dimensions, ScrollView, Modal } from 'react-native';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, where, onSnapshot, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons'; 
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import axios from 'axios';
import { Picker } from '@react-native-picker/picker';

const { width, height } = Dimensions.get('window');

// Fixed Persistence for React Native
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});
const db = getFirestore(app);

// ⚡ APNA RENDER URL YAHAN REPLACE KAREIN
const BACKEND_URL = "https://student-notes-hub-rdxq.onrender.com; 

export default function HomeScreen() {
    const [user, setUser] = useState<any>(null);
    const [appReady, setAppReady] = useState(false);
    const [notes, setNotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(false);

    // Form States
    const [subject, setSubject] = useState('');
    const [topic, setTopic] = useState('');
    const [organization, setOrganization] = useState('');
    const [classVal, setClassVal] = useState('');
    const [semesterVal, setSemesterVal] = useState('');
    const [fileNumberVal, setFileNumberVal] = useState('');
    const [description, setDescription] = useState('');

    // PDF States
    const [selectedPdfName, setSelectedPdfName] = useState<string | null>(null);
    const [selectedPdfUri, setSelectedPdfUri] = useState<string | null>(null);

    const [showAddNote, setShowAddNote] = useState(false);
    const addNoteHeight = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
            setAppReady(true);
            if (u) fetchNotes(u.uid);
        });
        return unsubscribe;
    }, []);

    const fetchNotes = (uid: string) => {
        const q = query(collection(db, "notes"), where("user_id", "==", uid));
        onSnapshot(q, (snapshot) => {
            setNotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
    };

    const handlePickDocument = async () => {
        let result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
        if (!result.canceled) {
            setSelectedPdfName(result.assets[0].name);
            setSelectedPdfUri(result.assets[0].uri);
        }
    };

    const handleAddNote = async () => {
        // Validation: Subject, Topic, PDF + At least one metadata
        const hasMetadata = classVal !== '' || semesterVal !== '' || fileNumberVal.trim() !== '';
        
        if (!subject.trim() || !topic.trim() || !selectedPdfUri || !hasMetadata) {
            alert("Subject, Topic, PDF aur Metadata (Class/Sem/File) mein se ek zaroori hai!");
            return;
        }

        const compiledMetadata = [
            classVal ? `Class: ${classVal}` : '',
            semesterVal ? `Sem: ${semesterVal}` : '',
            fileNumberVal.trim() ? `File: ${fileNumberVal.trim()}` : ''
        ].filter(Boolean).join(' | ');

        setUploadingFile(true);
        try {
            const formData = new FormData();
            formData.append('file', {
                uri: selectedPdfUri,
                name: selectedPdfName || 'file.pdf',
                type: 'application/pdf',
            } as any);
            formData.append('title', topic); // Backend expects 'title'
            formData.append('subject', subject);

            // 🚀 RENDER UPLOAD
            const res = await axios.post(`${BACKEND_URL}/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 60000, 
            });

            // ☁️ SAVE TO FIRESTORE
            await addDoc(collection(db, "notes"), {
                subject: subject.trim(),
                topic: topic.trim(),
                organization: organization.trim(),
                metadata: compiledMetadata,
                description: description.trim(),
                pdfServerUrl: res.data.file_url, // URL from Supabase/Render
                pdfName: selectedPdfName,
                user_id: user.uid,
                createdAt: serverTimestamp()
            });

            alert("Note Uploaded to Radium Grid! ⚡");
            resetForm();
        } catch (e) {
            console.error(e);
            alert("Upload failed. Check Render server status.");
        } finally {
            setUploadingFile(false);
        }
    };

    const resetForm = () => {
        setSubject(''); setTopic(''); setClassVal(''); setSemesterVal(''); 
        setFileNumberVal(''); setOrganization(''); setDescription('');
        setSelectedPdfName(null); setSelectedPdfUri(null);
        setShowAddNote(false);
    };

    if (!appReady) return <ActivityIndicator size="large" style={{flex:1}} />;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            {user ? (
                <View style={{ flex: 1, paddingTop: 50 }}>
                    <Text style={styles.headerTitle}>Radium Hub ⚡</Text>
                    
                    <FlatList 
                        data={notes}
                        keyExtractor={(item) => item.id}
                        renderItem={({item}) => (
                            <View style={styles.noteCard}>
                                <Text style={styles.cardSub}>{item.subject}</Text>
                                <Text style={styles.cardTitle}>{item.topic}</Text>
                                <Text style={styles.cardMeta}>{item.metadata}</Text>
                                <TouchableOpacity 
                                    style={styles.downloadBtn}
                                    onPress={async () => {
                                        const downloadPath = `${FileSystem.documentDirectory}${item.pdfName}`;
                                        const res = await FileSystem.downloadAsync(item.pdfServerUrl, downloadPath);
                                        Sharing.shareAsync(res.uri);
                                    }}
                                >
                                    <Text style={styles.downloadText}>Download PDF 📥</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    />

                    {/* MODAL / INPUT PANEL */}
                    {showAddNote && (
                        <View style={styles.inputControlPanel}>
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={{flexDirection:'row', justifyContent:'space-between'}}>
                                    <Text style={styles.panelHeaderTitle}>New Radium Block</Text>
                                    <TouchableOpacity onPress={() => setShowAddNote(false)}>
                                        <Ionicons name="close" size={24} color="#fff" />
                                    </TouchableOpacity>
                                </View>

                                <Text style={styles.outsideLabel}>SUBJECT</Text>
                                <TextInput style={styles.panelField} value={subject} onChangeText={setSubject} placeholder="e.g. Physics" placeholderTextColor="#475569" />

                                <Text style={styles.outsideLabel}>TOPIC</Text>
                                <TextInput style={styles.panelField} value={topic} onChangeText={setTopic} placeholder="e.g. Quantum Mechanics" placeholderTextColor="#475569" />

                                <Text style={styles.outsideLabel}>CLASS (1-12)</Text>
                                <View style={styles.pickerContainer}>
                                    <Picker
                                        selectedValue={classVal}
                                        onValueChange={(v) => { setClassVal(v); setSemesterVal(''); setFileNumberVal(''); }}
                                        style={{ color: '#fff' }} dropdownIconColor="#10B981"
                                    >
                                        <Picker.Item label="Select Class" value="" />
                                        {[...Array(12)].map((_, i) => <Picker.Item key={i} label={`Class ${i+1}`} value={`${i+1}`} />)}
                                    </Picker>
                                </View>

                                <Text style={styles.outsideLabel}>SEMESTER (1-10)</Text>
                                <View style={styles.pickerContainer}>
                                    <Picker
                                        selectedValue={semesterVal}
                                        onValueChange={(v) => { setSemesterVal(v); setClassVal(''); setFileNumberVal(''); }}
                                        style={{ color: '#fff' }} dropdownIconColor="#10B981"
                                    >
                                        <Picker.Item label="Select Semester" value="" />
                                        {[...Array(10)].map((_, i) => <Picker.Item key={i} label={`Semester ${i+1}`} value={`${i+1}`} />)}
                                    </Picker>
                                </View>

                                <Text style={styles.outsideLabel}>FILE NUMBER (TEXT)</Text>
                                <TextInput style={styles.panelField} value={fileNumberVal} onChangeText={(v) => { setFileNumberVal(v); setClassVal(''); setSemesterVal(''); }} placeholder="e.g. A-101" placeholderTextColor="#475569" />

                                <TouchableOpacity style={styles.attachBtn} onPress={handlePickDocument}>
                                    <Ionicons name="attach" size={20} color="#10B981" />
                                    <Text style={{color: '#10B981', marginLeft: 10}}>{selectedPdfName || "Attach PDF Document"}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.commitBtn} onPress={handleAddNote} disabled={uploadingFile}>
                                    {uploadingFile ? <ActivityIndicator color="#fff" /> : <Text style={styles.commitBtnText}>⚡ Commit to Cloud</Text>}
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    )}

                    <TouchableOpacity style={styles.fab} onPress={() => setShowAddNote(true)}>
                        <Ionicons name="add" size={32} color="#fff" />
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.centered}><Text style={{color:'#fff'}}>Login Required</Text></View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617', paddingHorizontal: 20 },
    headerTitle: { fontSize: 28, fontWeight: '900', color: '#fff', marginBottom: 20 },
    noteCard: { backgroundColor: '#0F172A', padding: 16, borderRadius: 15, marginBottom: 15, borderWidth: 1, borderColor: '#1E293B' },
    cardSub: { color: '#10B981', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
    cardTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginVertical: 4 },
    cardMeta: { color: '#64748B', fontSize: 12 },
    downloadBtn: { marginTop: 10, backgroundColor: '#10B98120', padding: 8, borderRadius: 8, alignItems: 'center' },
    downloadText: { color: '#10B981', fontWeight: 'bold', fontSize: 12 },
    inputControlPanel: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#0F172A', padding: 20, borderTopLeftRadius: 30, borderTopRightRadius: 30, height: height * 0.8, zIndex: 100 },
    panelHeaderTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
    outsideLabel: { fontSize: 10, fontWeight: 'bold', color: '#10B981', marginTop: 12, marginBottom: 5 },
    panelField: { backgroundColor: '#020617', borderRadius: 10, padding: 12, color: '#fff', borderWidth: 1, borderColor: '#1E293B' },
    pickerContainer: { backgroundColor: '#020617', borderRadius: 10, borderWidth: 1, borderColor: '#1E293B', marginTop: 5 },
    attachBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#020617', padding: 15, borderRadius: 10, marginTop: 15, borderStyle: 'dashed', borderWidth: 1, borderColor: '#10B981' },
    commitBtn: { backgroundColor: '#10B981', padding: 16, borderRadius: 12, marginTop: 20, alignItems: 'center' },
    commitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    fab: { position: 'absolute', bottom: 30, right: 20, backgroundColor: '#10B981', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});