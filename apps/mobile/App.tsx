import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { StatusBar } from 'expo-status-bar'
import { Text } from 'react-native'
import { HomeScreen } from './screens/HomeScreen'
import { RecognizeScreen } from './screens/RecognizeScreen'
import { LibraryScreen } from './screens/LibraryScreen'
import { ResultScreen } from './screens/ResultScreen'
import { CharacterScreen } from './screens/CharacterScreen'
import { PlaceholderScreen } from './screens/PlaceholderScreen'
import { colors } from './theme'

const Tabs = createBottomTabNavigator()
const Stack = createNativeStackNavigator()

function icon(label: string, active: boolean) { return <Text style={{ color: active ? colors.bronze : colors.inkSoft, fontSize: 19 }}>{label}</Text> }

function MainTabs() {
  return <Tabs.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.bronze, tabBarInactiveTintColor: colors.inkSoft, tabBarStyle: { backgroundColor: colors.paper, borderTopColor: colors.border, height: 66, paddingBottom: 8 }, tabBarLabelStyle: { fontSize: 12 } }}>
    <Tabs.Screen name="首页" component={HomeScreen} options={{ tabBarIcon: ({ focused }) => icon('殷', focused) }} />
    <Tabs.Screen name="识甲" component={RecognizeScreen} options={{ tabBarIcon: ({ focused }) => icon('识', focused) }} />
    <Tabs.Screen name="字库" component={LibraryScreen} options={{ tabBarIcon: ({ focused }) => icon('字', focused) }} />
    <Tabs.Screen name="学习" component={() => <PlaceholderScreen title="AI 学甲骨" detail="从识字、释义到字形演变，建立你的甲骨文学习路径。" />} options={{ tabBarIcon: ({ focused }) => icon('学', focused) }} />
    <Tabs.Screen name="我的" component={() => <PlaceholderScreen title="我的研究" detail="保存识别历史、个人甲骨库与研究记录。" />} options={{ tabBarIcon: ({ focused }) => icon('藏', focused) }} />
  </Tabs.Navigator>
}

export default function App() {
  return <NavigationContainer theme={{ ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.paper, card: colors.paper, text: colors.ink, border: colors.border, primary: colors.bronze } }}><StatusBar style="dark" /><Stack.Navigator><Stack.Screen name="主导航" component={MainTabs} options={{ headerShown: false }} /><Stack.Screen name="识别结果" component={ResultScreen} options={{ title: '识别结果', headerStyle: { backgroundColor: colors.darkBg }, headerTintColor: colors.darkText }} /><Stack.Screen name="字形详情" component={CharacterScreen} options={{ title: '字形详情', headerStyle: { backgroundColor: colors.paper }, headerTintColor: colors.ink }} /><Stack.Screen name="关于项目" children={() => <PlaceholderScreen title="项目介绍" detail="殷契拾文是面向甲骨文拓片识别、检索与研究的数字人文平台。" />} /><Stack.Screen name="字形演变" children={() => <PlaceholderScreen title="字形演变" detail="沿时间轴查看甲骨、金文、小篆、隶书与楷书的形体演化。" />} /><Stack.Screen name="字形对比" children={() => <PlaceholderScreen title="字形对比" detail="上下对比不同阶段的字形，保持统一背景以便观察笔画变化。" />} /><Stack.Screen name="个人甲骨库" children={() => <PlaceholderScreen title="个人甲骨库" detail="研究记录与上传拓片将保存在设备本地。" />} /><Stack.Screen name="甲骨知识" children={() => <PlaceholderScreen title="甲骨知识" detail="按主题浏览甲骨文、商代礼制与考古发现。" />} /><Stack.Screen name="数字史官" children={() => <PlaceholderScreen title="数字史官" detail="在殷墟玄黑的研究场景中，向数字史官询问文字、辞例与文明背景。" />} /><Stack.Screen name="数据统计" children={() => <PlaceholderScreen title="数据统计" detail="查看识别历史、学习进度与研究记录统计。" />} /><Stack.Screen name="答辩 Demo" children={() => <PlaceholderScreen title="答辩 Demo" detail="竖屏展陈模式将沿用品牌色板与研究叙事。" />} /><Stack.Screen name="系统自检" children={() => <PlaceholderScreen title="系统自检" detail="检查相机权限、模型资源、存储和本地运行环境。" />} /></Stack.Navigator></NavigationContainer>
}
