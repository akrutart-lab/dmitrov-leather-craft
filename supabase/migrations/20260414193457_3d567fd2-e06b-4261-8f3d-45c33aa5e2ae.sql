
-- Chat sessions table
CREATE TABLE public.chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

-- Anyone can create sessions
CREATE POLICY "Anyone can create chat sessions"
  ON public.chat_sessions FOR INSERT
  WITH CHECK (true);

-- Anyone can view their own session (by id, used from client)
CREATE POLICY "Anyone can view chat sessions"
  ON public.chat_sessions FOR SELECT
  USING (true);

-- Admins can update sessions (status changes)
CREATE POLICY "Admins can update chat sessions"
  ON public.chat_sessions FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Chat messages table
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Anyone can create messages
CREATE POLICY "Anyone can create chat messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (true);

-- Anyone can view messages (needed for chat history)
CREATE POLICY "Anyone can view chat messages"
  ON public.chat_messages FOR SELECT
  USING (true);

-- Trigger for updated_at on chat_sessions
CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
