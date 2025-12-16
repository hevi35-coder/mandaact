import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function TermsOfServicePage() {
    return (
        <div className="container mx-auto py-8 px-4 max-w-4xl">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
                <p className="text-muted-foreground">이용약관</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>MandaAct Terms of Service</CardTitle>
                    <CardDescription>
                        Last Updated: December 16, 2025
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
                                <h3 className="text-lg font-semibold mb-2">1. Service Overview</h3>
                                <p className="text-sm text-muted-foreground">
                                    MandaAct provides a Mandalart (9x9 goal framework) action tracking service with AI-powered reports and gamification features to help users achieve their goals through structured daily practice.
                                </p>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold mb-2">2. Subscription Terms</h3>
                                <div className="space-y-3">
                                    <div>
                                        <h4 className="text-sm font-semibold mb-1">2.1 Pricing</h4>
                                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                            <li>Monthly Subscription: $2.99/month</li>
                                            <li>Annual Subscription: $22.99/year</li>
                                        </ul>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold mb-1">2.2 Auto-Renewal</h4>
                                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                            <li>Payment will be charged to your Apple ID account at confirmation of purchase</li>
                                            <li>Subscription automatically renews unless auto-renew is turned off at least 24 hours before the end of the current period</li>
                                            <li>Your account will be charged for renewal within 24 hours prior to the end of the current period</li>
                                            <li>Subscriptions may be managed by the user and auto-renewal may be turned off by going to the user's Account Settings after purchase</li>
                                        </ul>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold mb-1">2.3 Cancellation</h4>
                                        <p className="text-sm text-muted-foreground">
                                            You can cancel your subscription at any time through your Apple Account Settings. When you cancel, you'll continue to have access until the end of your current billing period.
                                        </p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold mb-1">2.4 Refunds</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Refunds are processed according to Apple's refund policy. Refund requests must be made directly to Apple through the App Store.
                                        </p>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold mb-2">3. User Obligations</h3>
                                <p className="text-sm text-muted-foreground mb-2">
                                    Users must not engage in the following activities:
                                </p>
                                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                    <li>Actions that interfere with the normal operation of the Service</li>
                                    <li>Obtaining gamification elements (XP, badges, etc.) through fraudulent means</li>
                                    <li>Stealing or fraudulently using another person's information</li>
                                    <li>Violating laws or these Terms</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold mb-2">4. Service Modification and Suspension</h3>
                                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                    <li>The Company may change or add features to improve the Service</li>
                                    <li>The Company may discontinue the Service if there are significant business reasons, in which case 30 days' notice will be given</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold mb-2">5. AI-Generated Content</h3>
                                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                    <li>The Service provides AI-powered report and diagnostic features</li>
                                    <li>AI-generated content is provided for reference only and accuracy is not guaranteed</li>
                                    <li>Users should refer to AI-generated content but use it at their own discretion</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold mb-2">6. Privacy Protection</h3>
                                <p className="text-sm text-muted-foreground">
                                    The Company complies with relevant laws to protect users' personal information. For details, please refer to the <a href="/privacy" className="text-primary underline">Privacy Policy</a>.
                                </p>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold mb-2">7. Disclaimer</h3>
                                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                    <li>The Company is not liable for service interruptions due to natural disasters, force majeure, or system failures</li>
                                    <li>The Company is not responsible for results obtained by users through the Service</li>
                                    <li>The Company is not responsible for disputes between users or between users and third parties</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold mb-2">8. Governing Law and Jurisdiction</h3>
                                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                    <li>These Terms shall be governed by and construed in accordance with the laws of the Republic of Korea</li>
                                    <li>Any disputes arising from the use of the Service shall be subject to the jurisdiction of courts in the Republic of Korea</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold mb-2">9. Changes to Terms</h3>
                                <p className="text-sm text-muted-foreground">
                                    The Company may change these Terms as necessary, and the revised Terms shall take effect 7 days after notice. If users do not agree to the revised Terms, they may stop using the Service and withdraw.
                                </p>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold mb-2">Contact Information</h3>
                                <p className="text-sm text-muted-foreground">
                                    If you have any questions about these Terms, please contact: <a href="mailto:hevi35@gmail.com" className="text-primary underline">hevi35@gmail.com</a>
                                </p>
                            </section>
                        </TabsContent>

                        <TabsContent value="ko" className="space-y-6">
                            <section>
                                <h3 className="text-lg font-semibold mb-2">제1조 (목적)</h3>
                                <p className="text-sm text-muted-foreground">
                                    본 약관은 MandaAct(이하 "서비스")의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
                                </p>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold mb-2">제2조 (구독 서비스)</h3>
                                <div className="space-y-3">
                                    <div>
                                        <h4 className="text-sm font-semibold mb-1">2.1 구독 상품</h4>
                                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                            <li>월간 구독: $2.99/월</li>
                                            <li>연간 구독: $22.99/년</li>
                                        </ul>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold mb-1">2.2 자동 갱신</h4>
                                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                            <li>결제는 구매 확인 시 Apple ID 계정으로 청구됩니다</li>
                                            <li>구독은 현재 기간 종료 최소 24시간 전에 취소하지 않으면 자동으로 갱신됩니다</li>
                                            <li>계정에는 현재 기간 종료 24시간 이내에 갱신 비용이 청구됩니다</li>
                                            <li>구독은 구매 후 사용자의 계정 설정에서 관리할 수 있으며 자동 갱신을 끌 수 있습니다</li>
                                        </ul>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold mb-1">2.3 취소</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Apple 계정 설정을 통해 언제든지 구독을 취소할 수 있습니다. 취소 시 현재 청구 기간이 끝날 때까지 계속 액세스할 수 있습니다.
                                        </p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold mb-1">2.4 환불 정책</h4>
                                        <p className="text-sm text-muted-foreground">
                                            환불은 Apple의 환불 정책에 따라 처리됩니다. 환불 요청은 App Store를 통해 Apple에 직접 해야 합니다.
                                        </p>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold mb-2">제3조 (이용자의 의무)</h3>
                                <p className="text-sm text-muted-foreground mb-2">
                                    이용자는 다음 행위를 하여서는 안 됩니다:
                                </p>
                                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                    <li>서비스의 정상적인 운영을 방해하는 행위</li>
                                    <li>부정한 방법으로 게임화 요소(XP, 뱃지 등)를 획득하는 행위</li>
                                    <li>타인의 정보를 도용하거나 부정하게 사용하는 행위</li>
                                    <li>법령 또는 본 약관을 위반하는 행위</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold mb-2">제4조 (서비스의 변경 및 중단)</h3>
                                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                    <li>회사는 서비스의 개선을 위해 기능을 변경하거나 추가할 수 있습니다</li>
                                    <li>회사는 경영상 중대한 사유가 있는 경우 서비스를 중단할 수 있으며, 이 경우 30일 전 공지합니다</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold mb-2">제5조 (AI 생성 콘텐츠)</h3>
                                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                    <li>서비스는 AI를 활용한 리포트 및 진단 기능을 제공합니다</li>
                                    <li>AI 생성 콘텐츠는 참고용으로 제공되며, 정확성을 보장하지 않습니다</li>
                                    <li>이용자는 AI 생성 콘텐츠를 참고하되, 본인의 판단으로 활용해야 합니다</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold mb-2">제6조 (개인정보 보호)</h3>
                                <p className="text-sm text-muted-foreground">
                                    회사는 이용자의 개인정보를 보호하기 위해 관련 법령을 준수하며, 자세한 사항은 <a href="/privacy" className="text-primary underline">개인정보처리방침</a>에서 확인할 수 있습니다.
                                </p>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold mb-2">제7조 (면책 조항)</h3>
                                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                    <li>회사는 천재지변, 불가항력, 시스템 장애 등으로 인한 서비스 중단에 대해 책임을 지지 않습니다</li>
                                    <li>회사는 이용자가 서비스를 이용하여 얻은 결과에 대해 책임을 지지 않습니다</li>
                                    <li>회사는 이용자 간 또는 이용자와 제3자 간의 분쟁에 대해 책임을 지지 않습니다</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold mb-2">제8조 (준거법 및 관할)</h3>
                                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                    <li>본 약관의 해석 및 적용은 대한민국 법률을 따릅니다</li>
                                    <li>서비스 이용과 관련한 분쟁에 대해서는 대한민국 법원을 관할 법원으로 합니다</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold mb-2">제9조 (약관의 변경)</h3>
                                <p className="text-sm text-muted-foreground">
                                    회사는 필요한 경우 본 약관을 변경할 수 있으며, 변경된 약관은 공지 후 7일이 경과한 시점부터 효력이 발생합니다. 이용자가 변경된 약관에 동의하지 않을 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다.
                                </p>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold mb-2">문의</h3>
                                <p className="text-sm text-muted-foreground">
                                    본 약관에 대해 문의사항이 있으시면 <a href="mailto:hevi35@gmail.com" className="text-primary underline">hevi35@gmail.com</a>으로 연락 주시기 바랍니다.
                                </p>
                            </section>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    )
}
