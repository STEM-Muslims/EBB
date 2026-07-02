import TopicBrowser from "../../components/topics/TopicBrowser";

export default function UserTopicsPage() {
  return <TopicBrowser admin={false} base="/topics" />;
}
