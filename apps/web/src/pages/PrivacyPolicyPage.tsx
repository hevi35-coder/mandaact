import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function PrivacyPolicyPage() {
    return (
        <div className="container mx-auto py-8 px-4 max-w-4xl">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
                <p className="text-muted-foreground">개인정보 처리방침</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>UnwrittenBD Privacy Policy</CardTitle>
                    <CardDescription>
                        Effective Date: December 7, 2025
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="en" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-8">
                            <TabsTrigger value="en">English</TabsTrigger>
                            <TabsTrigger value="ko">한국어</TabsTrigger>
                        </TabsList>

                        <TabsContent value="en" className="space-y-6">
                            <section>
                                <h3 className="text-lg font-semibold mb-2">1. Introduction</h3>
                                <p className="text-sm text-muted-foreground">
                                    <strong>UnwrittenBD</strong> ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and share your personal information when you use our mobile application, <strong>MandaAct</strong>.
                                </p>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold mb-2">2. Information We Collect</h3>
                                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                    <li><strong>Personal Information:</strong> We collect your email address when you create an account to manage your data across devices.</li>
                                    <li><strong>Usage Data:</strong> We collect data on app activity, such as goals created, focus timer usage, and game progress (XP, Levels).</li>
                                    <li><strong>Device Information:</strong> We may collect specific device information (e.g., model, OS version, unique device identifiers) for advertising and analytics purposes.</li>
                                    <li><strong>Crash Data:</strong> We collect anonymous logs related to app failures via <strong>Sentry</strong> to improve stability.</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold mb-2">3. How We Use Your Information</h3>
                                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                    <li>To provide, maintain, and improve the Service (via <strong>Supabase</strong>).</li>
                                    <li>To monitor usage trends and detect technical issues.</li>
                                    <li>To display advertisements to support the free version of the Service (via <strong>Google AdMob</strong>).</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold mb-2">4. Third-Party Services</h3>
                                <p className="text-sm text-muted-foreground mb-2">We may share data with the following third-party providers:</p>
                                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                    <li><strong>Google AdMob:</strong> For displaying ads. Google may uses device identifiers to engage in personalized advertising.</li>
                                    <li><strong>Sentry:</strong> For error tracking and performance monitoring.</li>
                                    <li><strong>Supabase:</strong> For secure authentication and database hosting.</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold mb-2">5. Your Rights</h3>
                                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                    <li>Access or correct the personal data we hold about you.</li>
                                    <li>Request deletion of your account and associated data directly within the app settings.</li>
                                    <li>Opt-out of personalized advertising via your device settings (iOS: Settings &gt; Privacy &gt; Tracking; Android: Settings &gt; Google &gt; Ads).</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold mb-2">6. Data Retention</h3>
                                <p className="text-sm text-muted-foreground">
                                    We retain your personal information only for as long as is necessary for the purposes set out in this Privacy Policy. If you delete your account, your data will be removed from our active databases immediately.
                                </p>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold mb-2">7. Contact Us</h3>
                                <p className="text-sm text-muted-foreground">
                                    If you have any questions about this Privacy Policy, please contact us at:<br />
                                    <a href="mailto:support@unwrittenbd.com" className="text-primary hover:underline font-medium">support@unwrittenbd.com</a>
                                </p>
                            </section>
                        </TabsContent>

                        <TabsContent value="ko" className="space-y-6">
                            <section>
                                <h3 className="text-lg font-semibold mb-2">1. 개요</h3>
                                <p className="text-sm text-muted-foreground">
                                    <strong>UnwrittenBD</strong>(이하 "회사")는 <strong>MandaAct</strong> 서비스(이하 "서비스")를 이용하는 사용자의 개인정보를 소중히 다루며, 관련 법령을 준수합니다. 본 방침은 앱 사용 시 수집되는 정보와 그 정보를 사용하는 방법을 설명합니다.
                                </p>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold mb-2">2. 수집하는 개인정보 항목</h3>
                                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                    <li><strong>필수 정보:</strong> 이메일 주소 (회원가입 및 계정 동기화용)</li>
                                    <li><strong>기기 정보:</strong> 기기 모델명, OS 버전, 광고 식별자(ADID/IDFA)</li>
                                    <li><strong>서비스 이용 기록:</strong> 만다라트 목표 데이터, 실천 기록, XP 획득 로그</li>
                                    <li><strong>기타:</strong> 앱 오류 발생 시 수집되는 익명화된 로그 (Sentry)</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold mb-2">3. 개인정보의 처리 목적</h3>
                                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                    <li>서비스 제공, 회원 관리 및 데이터 동기화 (Supabase)</li>
                                    <li>앱 안정성 확보 및 버그 수정 (제3자 서비스: Sentry)</li>
                                    <li>광고 게재 및 성과 분석 (제3자 서비스: Google AdMob)</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold mb-2">4. 제3자 서비스 제공 및 광고</h3>
                                <p className="text-sm text-muted-foreground mb-2">본 앱은 무료 서비스를 유지하기 위해 <strong>Google AdMob</strong>을 사용하여 광고를 게재합니다.</p>
                                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                    <li>Google은 사용자의 관심사에 맞는 맞춤형 광고를 제공하기 위해 기기 식별자 및 데이터를 수집할 수 있습니다.</li>
                                    <li>사용자는 기기 설정에서 광고 추적을 거부할 수 있습니다.
                                        <ul className="list-disc list-inside ml-4 mt-1">
                                            <li>iOS: 설정 &gt; 개인정보 보호 &gt; 추적</li>
                                            <li>Android: 설정 &gt; Google &gt; 광고</li>
                                        </ul>
                                    </li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold mb-2">5. 개인정보의 보유 및 파기</h3>
                                <p className="text-sm text-muted-foreground">
                                    사용자의 개인정보는 <strong>회원 탈퇴 시까지</strong> 보유하며, 탈퇴 요청 시 지체 없이 파기합니다. 앱 내 '설정 &gt; 계정 삭제' 메뉴를 통해 언제든지 데이터를 삭제할 수 있습니다.
                                </p>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold mb-2">6. 문의처</h3>
                                <p className="text-sm text-muted-foreground">
                                    개인정보 관련 문의는 다음 이메일로 연락 주시기 바랍니다:<br />
                                    <a href="mailto:support@unwrittenbd.com" className="text-primary hover:underline font-medium">support@unwrittenbd.com</a>
                                </p>
                            </section>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    )
}
